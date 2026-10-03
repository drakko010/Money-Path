/**
 * Recurrencia financiera (Etapa 8) — SOLO SERVIDOR.
 *
 * Modelo de generación:
 * - Las plantillas viven en `recurring_transactions` (ingreso o gasto).
 * - Las ocurrencias se MATERIALIZAN de forma idempotente:
 *   · gastos  → filas en `expenses` (pasadas: pagadas; futuras: pendientes);
 *   · ingresos → ocurrencias hasta hoy en `income` (recibidas) y futuras en
 *     `future_receipts` (separadas de lo ya recibido, como exige el producto).
 * - Anti-duplicados: nunca se inserta una ocurrencia si ya existe
 *   (recurring_id + fecha).
 * - Horizonte: se generan ocurrencias desde `start_date` hasta hoy + 3 meses.
 */

import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  financialProfiles,
  futureReceipts,
  income,
  recurringTransactions,
} from "@/db/schema";
import type { MinorUnits } from "./money";
import { HORIZON_MONTHS, type RecurringFrequency } from "./recurring-shared";

export type { RecurringFrequency } from "./recurring-shared";
export { HORIZON_MONTHS, isRecurringFrequency, RECURRING_FREQUENCIES, UI_FREQUENCIES } from "./recurring-shared";

/* ── Fechas (UTC; `occurred_on`/`expected_on` son dates sin zona) ────── */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return isoDate(new Date());
}

function parseIso(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Fechas de ocurrencia de una plantilla, desde `fromDate` (inclusive) hasta
 * `horizonEnd` (inclusive), respetando `endDate`. Determinista.
 */
export function occurrenceDates(
  frequency: RecurringFrequency,
  startDate: string,
  endDate: string | null,
  fromDate: string,
  horizonEnd: string,
): string[] {
  const start = parseIso(startDate);
  const from = parseIso(fromDate);
  const end = horizonEnd < startDate ? startDate : horizonEnd;
  const cap = endDate && endDate < end ? endDate : end;

  const dates: string[] = [];

  if (frequency === "weekly" || frequency === "biweekly") {
    const stepDays = frequency === "weekly" ? 7 : 14;
    const diffDays = Math.floor((from.getTime() - start.getTime()) / 86400000);
    const skip = diffDays <= 0 ? 0 : Math.ceil(diffDays / stepDays);
    for (let k = skip; ; k += 1) {
      const date = new Date(start.getTime() + k * stepDays * 86400000);
      const value = isoDate(date);
      if (value > cap) break;
      if (value >= fromDate) dates.push(value);
      if (k > 2000) break;
    }
    return dates;
  }

  // Frecuencias mensuales: monthly (1m), bimonthly (2m), quarterly (3m), yearly (12m).
  const stepMonths =
    frequency === "monthly" ? 1 : frequency === "bimonthly" ? 2 : frequency === "quarterly" ? 3 : 12;
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();

  for (let k = 0; k < 2000; k += 1) {
    const totalMonths = startYear * 12 + startMonth + k * stepMonths;
    const year = Math.floor(totalMonths / 12);
    const month = totalMonths % 12;
    const day = Math.min(startDay, daysInMonth(year, month));
    const value = isoDate(new Date(Date.UTC(year, month, day)));
    if (value > cap) break;
    if (value >= fromDate) dates.push(value);
  }
  return dates;
}

/* ── Generación idempotente de ocurrencias ───────────────────────────── */

function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function minorOf(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

/**
 * Genera las ocurrencias faltantes de todas las plantillas activas del
 * usuario. Idempotente: se puede llamar en cada request sin duplicar nada.
 */
export async function ensureOccurrences(userId: string): Promise<void> {
  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = profileRows[0]?.baseCurrency ?? "MXN";

  const templates = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.status, "active"),
        isNull(recurringTransactions.deletedAt),
      ),
    );
  if (templates.length === 0) return;

  const today = todayIso();
  const horizon = new Date();
  horizon.setUTCMonth(horizon.getUTCMonth() + HORIZON_MONTHS);
  const horizonEnd = isoDate(horizon);
  const templateIds = templates.map((template) => template.id);

  // Ocurrencias ya existentes (dedupe por plantilla + fecha).
  const [existingExpenses, existingIncome, existingReceipts] = await Promise.all([
    db
      .select({ recurringId: expenses.recurringId, occurredOn: expenses.occurredOn })
      .from(expenses)
      .where(and(inArray(expenses.recurringId, templateIds), isNull(expenses.deletedAt))),
    db
      .select({ recurringId: income.recurringId, occurredOn: income.occurredOn })
      .from(income)
      .where(and(inArray(income.recurringId, templateIds), isNull(income.deletedAt))),
    db
      .select({ recurringId: futureReceipts.recurringId, expectedOn: futureReceipts.expectedOn })
      .from(futureReceipts)
      .where(and(inArray(futureReceipts.recurringId, templateIds), isNull(futureReceipts.deletedAt))),
  ]);

  const existingKeys = new Set<string>();
  for (const row of existingExpenses) {
    if (row.recurringId) existingKeys.add(`${row.recurringId}|${String(row.occurredOn)}`);
  }
  for (const row of existingIncome) {
    if (row.recurringId) existingKeys.add(`${row.recurringId}|${String(row.occurredOn)}`);
  }
  for (const row of existingReceipts) {
    if (row.recurringId) existingKeys.add(`${row.recurringId}|${String(row.expectedOn)}`);
  }

  for (const template of templates) {
    const endDate = template.endDate ? String(template.endDate) : null;
    const dates = occurrenceDates(
      template.frequency as RecurringFrequency,
      String(template.startDate),
      endDate,
      String(template.startDate),
      horizonEnd,
    );
    if (dates.length === 0) continue;

    const amount = decimal(minorOf(template.amount));
    const expenseInserts: typeof expenses.$inferInsert[] = [];
    const incomeInserts: typeof income.$inferInsert[] = [];
    const receiptInserts: typeof futureReceipts.$inferInsert[] = [];

    for (const date of dates) {
      if (existingKeys.has(`${template.id}|${date}`)) continue;
      existingKeys.add(`${template.id}|${date}`);

      if (template.kind === "expense") {
        expenseInserts.push({
          userId,
          categoryId: template.expenseCategoryId,
          recurringId: template.id,
          description: template.description,
          amount,
          currency,
          occurredOn: date,
          kind: "fixed",
          status: date <= today ? "paid" : "pending",
        });
      } else if (date <= today) {
        incomeInserts.push({
          userId,
          categoryId: template.incomeCategoryId,
          recurringId: template.id,
          description: template.description,
          amount,
          currency,
          occurredOn: date,
          status: "received",
        });
      } else {
        receiptInserts.push({
          userId,
          recurringId: template.id,
          description: template.description,
          amount,
          currency,
          expectedOn: date,
          status: "pending",
        });
      }
    }

    if (expenseInserts.length > 0) await db.insert(expenses).values(expenseInserts);
    if (incomeInserts.length > 0) await db.insert(income).values(incomeInserts);
    if (receiptInserts.length > 0) await db.insert(futureReceipts).values(receiptInserts);

    // La plantilla se marca completada si ya pasó su fecha final.
    if (endDate && endDate < today) {
      await db
        .update(recurringTransactions)
        .set({ status: "completed" })
        .where(eq(recurringTransactions.id, template.id));
    } else if (dates.length > 0) {
      await db
        .update(recurringTransactions)
        .set({ nextOccurrence: dates.find((date) => date >= today) ?? dates[dates.length - 1] })
        .where(eq(recurringTransactions.id, template.id));
    }
  }
}

/* ── Edición por alcance ─────────────────────────────────────────────── */

export type EditScope = "one" | "following" | "all";

export interface TemplatePatch {
  description?: string;
  amount?: string; // texto decimal ya validado por quien llama
  categoryId?: string | null;
  frequency?: RecurringFrequency;
  endDate?: string | null;
}

/**
 * Aplica una edición según el alcance:
 * - "one": modifica solo la ocurrencia en `refDate` (gasto/ingreso/cobro).
 * - "following"/"all": actualiza la plantilla y regenera desde `refDate`
 *   (o desde el inicio para "all"), descartando ocurrencias generadas en
 *   ese rango. Confirmación explícita exigida en la UI.
 */
export async function applyScopedEdit(
  userId: string,
  templateId: string,
  patch: TemplatePatch,
  scope: EditScope,
  refDate: string,
  currency: string,
): Promise<{ ok: true } | { ok: false; message: "not_found" | "occurrence_not_found" }> {
  const templates = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.id, templateId),
        eq(recurringTransactions.userId, userId),
        isNull(recurringTransactions.deletedAt),
      ),
    )
    .limit(1);
  const template = templates[0];
  if (!template) return { ok: false, message: "not_found" };

  if (scope === "one") {
    const expenseResult = await db
      .update(expenses)
      .set({
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      })
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.recurringId, templateId),
          eq(expenses.occurredOn, refDate),
          isNull(expenses.deletedAt),
        ),
      )
      .returning({ id: expenses.id });

    if (expenseResult.length > 0) return { ok: true };

    const incomeResult = await db
      .update(income)
      .set({
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      })
      .where(
        and(
          eq(income.userId, userId),
          eq(income.recurringId, templateId),
          eq(income.occurredOn, refDate),
          isNull(income.deletedAt),
        ),
      )
      .returning({ id: income.id });

    if (incomeResult.length > 0) return { ok: true };

    const receiptResult = await db
      .update(futureReceipts)
      .set({
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      })
      .where(
        and(
          eq(futureReceipts.userId, userId),
          eq(futureReceipts.recurringId, templateId),
          eq(futureReceipts.expectedOn, refDate),
          isNull(futureReceipts.deletedAt),
        ),
      )
      .returning({ id: futureReceipts.id });

    return receiptResult.length > 0 ? { ok: true } : { ok: false, message: "occurrence_not_found" };
  }

  /* "following" o "all": actualizar plantilla + regenerar. */
  const isExpense = template.kind === "expense";

  await db
    .update(recurringTransactions)
    .set({
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
      ...(patch.frequency !== undefined ? { frequency: patch.frequency } : {}),
      ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
      ...(isExpense
        ? patch.categoryId !== undefined
          ? { expenseCategoryId: patch.categoryId }
          : {}
        : patch.categoryId !== undefined
          ? { incomeCategoryId: patch.categoryId }
          : {}),
    })
    .where(eq(recurringTransactions.id, templateId));

  const fromDate = scope === "all" ? String(template.startDate) : refDate;

  // Descartar ocurrencias generadas en el rango (operación explícita del
  // usuario, confirmada en la UI).
  await db
    .delete(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurringId, templateId),
        gte(expenses.occurredOn, fromDate),
      ),
    );
  await db
    .delete(income)
    .where(
      and(
        eq(income.userId, userId),
        eq(income.recurringId, templateId),
        gte(income.occurredOn, fromDate),
      ),
    );
  await db
    .delete(futureReceipts)
    .where(
      and(
        eq(futureReceipts.userId, userId),
        eq(futureReceipts.recurringId, templateId),
        gte(futureReceipts.expectedOn, fromDate),
      ),
    );

  void currency;

  await ensureOccurrences(userId);
  return { ok: true };
}
