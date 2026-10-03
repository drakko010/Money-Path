import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { debtPayments, debts, financialProfiles } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import { isDebtKind } from "@/lib/debts-shared";
import { decimal, isValidIsoDateServer, minorOf } from "@/lib/debts-helpers";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Módulo Deudas (Etapa 10):
 * - `create`: registra la deuda.
 * - `pay`: registra un abono, descuenta el saldo y marca pagada al llegar a 0.
 * - `delete`: borrado suave (los abonos quedan en el historial).
 * Nunca ejecuta pagos reales.
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
    return fail(dict.debtsModule.form.errors.generic);
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
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.debtsModule.form.errors.name);

    let initialMinor: MinorUnits;
    try {
      initialMinor = toMinorUnits(typeof body.initialAmount === "string" ? body.initialAmount : "", currency);
    } catch {
      return fail(dict.debtsModule.form.errors.initial);
    }
    if (initialMinor <= 0) return fail(dict.debtsModule.form.errors.initial);

    let balanceMinor: MinorUnits;
    try {
      const balanceText =
        typeof body.balance === "string" && body.balance.trim()
          ? body.balance
          : typeof body.initialAmount === "string"
            ? body.initialAmount
            : "";
      balanceMinor = toMinorUnits(balanceText, currency);
    } catch {
      return fail(dict.debtsModule.form.errors.balance);
    }
    if (balanceMinor < 0 || balanceMinor > initialMinor) {
      return fail(dict.debtsModule.form.errors.balance);
    }

    let rate = 0;
    if (typeof body.rate === "string" && body.rate.trim()) {
      const parsed = Number(body.rate.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 300) {
        return fail(dict.debtsModule.form.errors.rate);
      }
      rate = parsed;
    }

    let dueDay: number | null = null;
    if (body.dueDay !== null && body.dueDay !== undefined && String(body.dueDay).trim() !== "") {
      dueDay = Number(body.dueDay);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return fail(dict.debtsModule.form.errors.dueDay);
      }
    }

    let minimumMinor: MinorUnits | null = null;
    if (typeof body.minimum === "string" && body.minimum.trim()) {
      try {
        minimumMinor = toMinorUnits(body.minimum, currency);
      } catch {
        return fail(dict.debtsModule.form.errors.minimum);
      }
      if (minimumMinor < 0) return fail(dict.debtsModule.form.errors.minimum);
    }

    let totalInstallments: number | null = null;
    if (body.installments !== null && body.installments !== undefined && String(body.installments).trim() !== "") {
      totalInstallments = Number(body.installments);
      if (!Number.isInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > 600) {
        return fail(dict.debtsModule.form.errors.installments);
      }
    }

    const priorityRaw = Number(body.priority);
    const priority = [1, 2, 3].includes(priorityRaw) ? priorityRaw : 2;

    const kind = typeof body.kind === "string" && isDebtKind(body.kind) ? body.kind : "other";
    const status = body.status === "defaulted" ? "defaulted" : "active";
    const creditor = typeof body.creditor === "string" && body.creditor.trim() ? body.creditor.trim().slice(0, 120) : null;

    await db.insert(debts).values({
      userId,
      name,
      creditor,
      kind,
      initialAmount: decimal(initialMinor),
      currency,
      outstandingBalance: decimal(balanceMinor),
      annualInterestRate: rate.toFixed(4),
      minimumPayment: minimumMinor === null ? null : decimal(minimumMinor),
      dueDay,
      totalInstallments,
      priority,
      status,
      startDate: new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json({ ok: true });
  }

  /* ── operaciones sobre deuda existente ──────────────────────────── */
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(dict.debtsModule.form.errors.generic);

  const rows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
    .limit(1);
  const debt = rows[0];
  if (!debt) return fail(dict.debtsModule.form.errors.generic, 404);

  if (op === "pay") {
    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(typeof body.amount === "string" ? body.amount : "", currency);
    } catch {
      return fail(dict.debtsModule.payForm.errors.amount);
    }
    if (amountMinor <= 0) return fail(dict.debtsModule.payForm.errors.amount);

    const paidOn = typeof body.date === "string" && isValidIsoDateServer(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;

    const balanceMinor = minorOf(debt.outstandingBalance);
    if (amountMinor > balanceMinor) {
      return fail(dict.debtsModule.payForm.errors.exceeds);
    }

    await db.insert(debtPayments).values({
      userId,
      debtId: debt.id,
      amount: decimal(amountMinor),
      currency,
      paidOn,
      note,
    });

    const newBalance = balanceMinor - amountMinor;
    await db
      .update(debts)
      .set({
        outstandingBalance: decimal(newBalance),
        status: newBalance <= 0 ? "paid_off" : debt.status === "defaulted" ? "defaulted" : "active",
      })
      .where(eq(debts.id, debt.id));

    return NextResponse.json({ ok: true, newBalance });
  }

  if (op === "delete") {
    await db
      .update(debts)
      .set({ deletedAt: new Date(), status: "cancelled" })
      .where(eq(debts.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.debtsModule.form.errors.generic);
}
