import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseCategories,
  expenses,
  financialProfiles,
  futureReceipts,
  income,
  incomeCategories,
  recurringTransactions,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const INCOME_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function minorToDecimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Crea un movimiento del presupuesto:
 * - ingreso (con recurrencia y/o cobro futuro);
 * - gasto (tipo, estado y observación).
 * Seguridad: siempre con el usuario de la sesión y su moneda base.
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
    return fail(dict.presupuesto.form.errors.generic);
  }

  const table = body.table;
  if (table !== "income" && table !== "expenses") {
    return fail(dict.presupuesto.form.errors.generic);
  }

  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile) return fail(dict.presupuesto.form.errors.generic);
  const currency = profile.baseCurrency as CurrencyCode;

  // Campos comunes.
  const date = typeof body.date === "string" ? body.date : "";
  if (!isValidDate(date)) return fail(dict.presupuesto.form.errors.date);

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length === 0 || description.length > 200) {
    return fail(dict.presupuesto.form.errors.description);
  }

  const amountText = typeof body.amount === "string" ? body.amount : "";
  let amountMinor: MinorUnits;
  try {
    amountMinor = toMinorUnits(amountText, currency);
  } catch {
    return fail(dict.presupuesto.form.errors.amount);
  }
  if (amountMinor <= 0) return fail(dict.presupuesto.form.errors.amount);

  const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;

  if (table === "income") {
    if (categoryId) {
      const owner = await db
        .select({ id: incomeCategories.id })
        .from(incomeCategories)
        .where(
          and(eq(incomeCategories.id, categoryId), eq(incomeCategories.userId, userId), isNull(incomeCategories.deletedAt)),
        )
        .limit(1);
      if (owner.length === 0) return fail(dict.presupuesto.form.errors.category);
    }

    const recurrence = typeof body.recurrence === "string" ? body.recurrence : "none";
    const isRecurring = recurrence !== "none";
    if (isRecurring && !(INCOME_FREQUENCIES as readonly string[]).includes(recurrence)) {
      return fail(dict.presupuesto.form.errors.generic);
    }
    const isFuture = body.isFuture === true;

    let recurringId: string | null = null;
    if (isRecurring) {
      const recurringRows = await db
        .insert(recurringTransactions)
        .values({
          userId,
          kind: "income",
          incomeCategoryId: categoryId,
          description,
          amount: minorToDecimal(amountMinor),
          currency,
          frequency: recurrence as IncomeFrequency,
          startDate: date,
          nextOccurrence: date,
          lastGeneratedOn: date,
          status: "active",
        })
        .returning({ id: recurringTransactions.id });
      recurringId = recurringRows[0]?.id ?? null;
    }

    const incomeRows = await db
      .insert(income)
      .values({
        userId,
        categoryId,
        recurringId,
        description,
        amount: minorToDecimal(amountMinor),
        currency,
        occurredOn: date,
        status: isFuture ? "pending" : "received",
      })
      .returning({ id: income.id });
    const incomeId = incomeRows[0]?.id;
    if (!incomeId) return fail(dict.presupuesto.form.errors.generic, 500);

    if (isFuture) {
      await db.insert(futureReceipts).values({
        userId,
        description,
        amount: minorToDecimal(amountMinor),
        currency,
        expectedOn: date,
        receivedIncomeId: incomeId,
        status: "pending",
      });
    }

    return NextResponse.json({ ok: true, id: incomeId });
  }

  /* ── Gasto ─────────────────────────────────────────────────────── */

  let categoryKind: "fixed" | "variable" | null = null;
  if (categoryId) {
    const owner = await db
      .select({ id: expenseCategories.id, kind: expenseCategories.kind })
      .from(expenseCategories)
      .where(
        and(eq(expenseCategories.id, categoryId), eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)),
      )
      .limit(1);
    if (owner.length === 0) return fail(dict.presupuesto.form.errors.category);
    categoryKind = owner[0].kind as "fixed" | "variable";
  }

  const kind = body.kind === "fixed" ? "fixed" : body.kind === "variable" ? "variable" : categoryKind ?? "variable";
  const status = body.status === "pending" ? "pending" : "paid";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const expenseRows = await db
    .insert(expenses)
    .values({
      userId,
      categoryId,
      description,
      amount: minorToDecimal(amountMinor),
      currency,
      occurredOn: date,
      kind,
      status,
      note,
    })
    .returning({ id: expenses.id });
  const expenseId = expenseRows[0]?.id;
  if (!expenseId) return fail(dict.presupuesto.form.errors.generic, 500);

  return NextResponse.json({ ok: true, id: expenseId });
}
