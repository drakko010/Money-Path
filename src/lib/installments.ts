/**
 * Compras parceladas (Etapa 9) — SOLO SERVIDOR.
 *
 * Cada compra parcelada materializa sus cuotas como gastos reales
 * (`expenses.installment_id` + `installment_number`) en la fecha de vencimiento
 * de cada una: así cada cuota impacta su mes correspondiente y el total
 * NUNCA se contabiliza en un solo mes.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  financialProfiles,
  installments,
} from "@/db/schema";
import type { MinorUnits } from "./money";
import { MAX_INSTALLMENTS, type PaymentMethod } from "./installments-shared";

export type { PaymentMethod } from "./installments-shared";
export { isPaymentMethod, MAX_INSTALLMENTS, PAYMENT_METHODS } from "./installments-shared";

/* ── Fechas ──────────────────────────────────────────────────────────── */

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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Fecha de la cuota k (1-indexada): primer vencimiento + (k-1) meses. */
export function installmentDueDate(firstDueDate: string, k: number): string {
  const first = new Date(`${firstDueDate}T00:00:00Z`);
  const targetMonths =
    first.getUTCFullYear() * 12 + first.getUTCMonth() + (k - 1);
  const year = Math.floor(targetMonths / 12);
  const month = targetMonths % 12;
  const day = Math.min(first.getUTCDate(), daysInMonth(year, month));
  return isoDate(new Date(Date.UTC(year, month, day)));
}

/* ── Montos por cuota ────────────────────────────────────────────────── */

/**
 * Distribuye el total entre n cuotas (en centavos, sin flotantes):
 * base = floor(total/n); las primeras `remainder` cuotas llevan +1 centavo.
 */
export function installmentAmounts(
  totalMinor: MinorUnits,
  count: number,
): { base: MinorUnits; remainder: number; first: MinorUnits } {
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  return { base, remainder, first: base + (remainder > 0 ? 1 : 0) };
}

export function installmentAmountFor(
  totalMinor: MinorUnits,
  count: number,
  k: number,
): MinorUnits {
  const { base, remainder } = installmentAmounts(totalMinor, count);
  return k <= remainder ? base + 1 : base;
}

export function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function minorOf(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

/* ── Generación idempotente de cuotas ────────────────────────────────── */

/**
 * Materializa las cuotas faltantes de todos los planes activos del usuario.
 * Cada cuota es un gasto en su fecha de vencimiento: pendiente hasta que se
 * marque como pagada. Anti-duplicados por (plan + número de cuota).
 */
export async function ensureInstallmentOccurrences(userId: string): Promise<void> {
  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = profileRows[0]?.baseCurrency ?? "MXN";

  const plans = await db
    .select()
    .from(installments)
    .where(
      and(
        eq(installments.userId, userId),
        eq(installments.status, "active"),
        isNull(installments.deletedAt),
      ),
    );
  if (plans.length === 0) return;

  const planIds = plans.map((plan) => plan.id);
  const existing = await db
    .select({ installmentId: expenses.installmentId, installmentNumber: expenses.installmentNumber })
    .from(expenses)
    .where(and(inArray(expenses.installmentId, planIds), isNull(expenses.deletedAt)));
  const existingKeys = new Set(
    existing
      .filter((row) => row.installmentId && row.installmentNumber !== null)
      .map((row) => `${row.installmentId}|${row.installmentNumber}`),
  );

  const inserts: Array<typeof expenses.$inferInsert> = [];

  for (const plan of plans) {
    const totalMinor = minorOf(plan.totalAmount);
    const count = plan.totalInstallments;

    for (let k = 1; k <= count; k += 1) {
      if (existingKeys.has(`${plan.id}|${k}`)) continue;
      existingKeys.add(`${plan.id}|${k}`);

      inserts.push({
        userId,
        categoryId: plan.categoryId,
        installmentId: plan.id,
        installmentNumber: k,
        description: `${plan.description} (${k}/${count})`,
        amount: decimal(installmentAmountFor(totalMinor, count, k)),
        currency,
        occurredOn: installmentDueDate(String(plan.firstDueDate), k),
        kind: "fixed",
        status: "pending",
      });
    }
  }

  if (inserts.length > 0) {
    await db.insert(expenses).values(inserts);
  }

  // Sincroniza el contador de cuotas pagadas y marca planes completados.
  for (const plan of plans) {
    const paidRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(
        and(
          eq(expenses.installmentId, plan.id),
          eq(expenses.userId, userId),
          eq(expenses.status, "paid"),
          isNull(expenses.deletedAt),
        ),
      );
    const paidCount = Number(paidRows[0]?.count ?? 0);
    if (paidCount !== plan.paidInstallments) {
      await db
        .update(installments)
        .set({ paidInstallments: paidCount })
        .where(eq(installments.id, plan.id));
    }
    if (paidCount >= plan.totalInstallments && plan.status === "active") {
      await db
        .update(installments)
        .set({ status: "completed", paidInstallments: plan.totalInstallments })
        .where(eq(installments.id, plan.id));
    }
  }
}

/* ── Vista del módulo ────────────────────────────────────────────────── */

export interface InstallmentOccurrenceView {
  number: number;
  date: string;
  amountMinor: MinorUnits;
  status: "paid" | "pending" | "cancelled";
  expenseId: string | null;
}

export interface InstallmentView {
  id: string;
  description: string;
  totalMinor: MinorUnits;
  count: number;
  paidCount: number;
  paidMinor: MinorUnits;
  remainingMinor: MinorUnits;
  perInstallmentMinor: MinorUnits;
  perInstallmentEven: boolean;
  firstDueDate: string;
  endDate: string;
  nextDate: string | null;
  nextNumber: number | null;
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  status: string;
  occurrences: InstallmentOccurrenceView[];
}

/** Lista los planes del usuario con todos los cálculos derivados. */
export async function listInstallments(userId: string): Promise<InstallmentView[]> {
  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = profileRows[0]?.baseCurrency ?? "MXN";

  const plans = await db
    .select({
      id: installments.id,
      description: installments.description,
      totalAmount: installments.totalAmount,
      totalInstallments: installments.totalInstallments,
      paidInstallments: installments.paidInstallments,
      firstDueDate: installments.firstDueDate,
      paymentMethod: installments.paymentMethod,
      status: installments.status,
    })
    .from(installments)
    .where(and(eq(installments.userId, userId), isNull(installments.deletedAt)))
    .orderBy(installments.createdAt);

  void currency;

  // Cargamos las cuotas materializadas para derivar estados reales.
  const planIds = plans.map((plan) => plan.id);
  const occurrenceRows =
    planIds.length > 0
      ? await db
          .select({
            installmentId: expenses.installmentId,
            installmentNumber: expenses.installmentNumber,
            occurredOn: expenses.occurredOn,
            amount: expenses.amount,
            status: expenses.status,
            id: expenses.id,
          })
          .from(expenses)
          .where(and(inArray(expenses.installmentId, planIds), isNull(expenses.deletedAt)))
      : [];

  const today = todayIso();
  const views: InstallmentView[] = [];

  for (const plan of plans) {
    const totalMinor = minorOf(plan.totalAmount);
    const count = plan.totalInstallments;
    const { base, remainder } = installmentAmounts(totalMinor, count);

    const planOccurrences = occurrenceRows.filter((row) => row.installmentId === plan.id);
    const paidRows = planOccurrences.filter((row) => row.status === "paid");
    const paidCount = paidRows.length;
    const paidMinor = paidRows.reduce((acc, row) => acc + minorOf(row.amount), 0);

    const occurrences: InstallmentOccurrenceView[] = [];
    for (let k = 1; k <= count; k += 1) {
      const row = planOccurrences.find(
        (candidate) => candidate.installmentNumber === k,
      );
      occurrences.push({
        number: k,
        date: row ? String(row.occurredOn) : installmentDueDate(String(plan.firstDueDate), k),
        amountMinor: row ? minorOf(row.amount) : installmentAmountFor(totalMinor, count, k),
        status:
          row && row.status === "paid"
            ? "paid"
            : row && row.status === "cancelled"
              ? "cancelled"
              : "pending",
        expenseId: row?.id ?? null,
      });
    }

    const next = occurrences.find((occurrence) => occurrence.status === "pending");

    views.push({
      id: plan.id,
      description: plan.description,
      totalMinor,
      count,
      paidCount,
      paidMinor,
      remainingMinor: totalMinor - paidMinor,
      perInstallmentMinor: base + (remainder > 0 ? 1 : 0),
      perInstallmentEven: remainder === 0,
      firstDueDate: String(plan.firstDueDate),
      endDate: installmentDueDate(String(plan.firstDueDate), count),
      nextDate: next ? next.date : null,
      nextNumber: next ? next.number : null,
      categoryName: null,
      paymentMethod: (plan.paymentMethod as PaymentMethod) ?? "other",
      status: plan.status,
      occurrences,
    });
    void today;
  }

  // Nombres de categoría por plan (una consulta aparte para claridad).
  if (views.length > 0) {
    const categoryIds = await db
      .select({ id: installments.id, categoryId: installments.categoryId })
      .from(installments)
      .where(and(inArray(installments.id, planIds), isNull(installments.deletedAt)));
    const ids = Array.from(
      new Set(categoryIds.map((row) => row.categoryId).filter((id): id is string => Boolean(id))),
    );
    if (ids.length > 0) {
      const { expenseCategories } = await import("@/db/schema");
      const categories = await db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(inArray(expenseCategories.id, ids));
      const nameById = new Map(categories.map((row) => [row.id, row.name]));
      const categoryByPlan = new Map(
        categoryIds.map((row) => [row.id, row.categoryId ?? null]),
      );
      for (const view of views) {
        const categoryId = categoryByPlan.get(view.id);
        view.categoryName = categoryId ? (nameById.get(categoryId) ?? null) : null;
      }
    }
  }

  return views;
}
