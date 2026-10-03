import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseCategories,
  expenses,
  financialProfiles,
  installments,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import {
  ensureInstallmentOccurrences,
  installmentAmountFor,
  installmentDueDate,
  isValidIsoDate,
  isPaymentMethod,
  MAX_INSTALLMENTS,
} from "@/lib/installments";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function decimal(minor: MinorUnits): string {
  const abs = Math.abs(minor);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Compras parceladas (Etapa 9):
 * - `create`: crea el plan y materializa sus cuotas como gastos por mes.
 * - `payCuota`: marca una cuota como pagada y sincroniza el contador.
 * - `delete`: borrado suave del plan; cancela las cuotas impagas (las
 *   pagadas permanecen en el historial).
 */
export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) return fail(dict.auth.errors.generic, 401);
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(dict.installments.form.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = (profileRows[0]?.baseCurrency ?? "MXN") as CurrencyCode;
  const op = body.op;

  /* ── create ─────────────────────────────────────────────────────── */
  if (op === "create") {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description || description.length > 200) return fail(dict.installments.form.errors.description);

    let totalMinor: MinorUnits;
    try {
      totalMinor = toMinorUnits(typeof body.totalAmount === "string" ? body.totalAmount : "", currency);
    } catch {
      return fail(dict.installments.form.errors.total);
    }
    if (totalMinor <= 0) return fail(dict.installments.form.errors.total);

    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 2 || count > MAX_INSTALLMENTS) {
      return fail(dict.installments.form.errors.count);
    }

    const firstDueDate = typeof body.firstDueDate === "string" ? body.firstDueDate : "";
    if (!isValidIsoDate(firstDueDate)) return fail(dict.installments.form.errors.firstDate);

    const paymentMethod =
      typeof body.paymentMethod === "string" && isPaymentMethod(body.paymentMethod)
        ? body.paymentMethod
        : null;
    if (!paymentMethod) return fail(dict.installments.form.errors.generic);

    const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
    if (categoryId) {
      const owner = await db
        .select({ id: expenseCategories.id })
        .from(expenseCategories)
        .where(
          and(
            eq(expenseCategories.id, categoryId),
            eq(expenseCategories.userId, userId),
            isNull(expenseCategories.deletedAt),
          ),
        )
        .limit(1);
      if (owner.length === 0) return fail(dict.presupuesto.form.errors.category);
    }

    await db.insert(installments).values({
      userId,
      description,
      totalAmount: decimal(totalMinor),
      currency,
      totalInstallments: count,
      firstDueDate,
      categoryId,
      paymentMethod,
      status: "active",
    });

    await ensureInstallmentOccurrences(userId);
    return NextResponse.json({ ok: true });
  }

  /* ── operaciones sobre plan existente ───────────────────────────── */
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(dict.installments.form.errors.generic);

  const plans = await db
    .select()
    .from(installments)
    .where(
      and(eq(installments.id, id), eq(installments.userId, userId), isNull(installments.deletedAt)),
    )
    .limit(1);
  const plan = plans[0];
  if (!plan) return fail(dict.installments.errors.notFound, 404);

  if (op === "payCuota") {
    const number = Number(body.number);
    if (!Number.isInteger(number) || number < 1 || number > plan.totalInstallments) {
      return fail(dict.installments.form.errors.generic);
    }

    const rows = await db
      .update(expenses)
      .set({ status: "paid" })
      .where(
        and(
          eq(expenses.installmentId, id),
          eq(expenses.userId, userId),
          eq(expenses.installmentNumber, number),
          isNull(expenses.deletedAt),
        ),
      )
      .returning({ id: expenses.id });
    if (rows.length === 0) {
      return fail(dict.installments.errors.cuotaNotFound, 404);
    }

    // Sincroniza el contador y el estado del plan.
    const paidRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.installmentId, id),
          eq(expenses.userId, userId),
          eq(expenses.status, "paid"),
          isNull(expenses.deletedAt),
        ),
      );
    const paidCount = Number(paidRows[0]?.count ?? 0);
    await db
      .update(installments)
      .set({
        paidInstallments: paidCount,
        status: paidCount >= plan.totalInstallments ? "completed" : "active",
      })
      .where(eq(installments.id, id));

    return NextResponse.json({ ok: true, paidCount });
  }

  if (op === "delete") {
    // Cancela solo las cuotas impagas: lo ya pagado es historial real.
    await db
      .update(expenses)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(expenses.installmentId, id),
          eq(expenses.userId, userId),
          sql`${expenses.status} != 'paid'`,
          isNull(expenses.deletedAt),
        ),
      );
    await db
      .update(installments)
      .set({ deletedAt: new Date(), status: "cancelled" })
      .where(eq(installments.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.installments.form.errors.generic);
}
