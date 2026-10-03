/**
 * Módulo Presupuesto (Etapa 7) — capa de datos. SOLO SERVIDOR.
 *
 * - Todo se filtra por el usuario de la sesión y por su moneda base:
 *   nunca se mezclan monedas.
 * - Borrado suave: eliminar un movimiento solo marca `deleted_at`.
 * - El resumen del período considera ingresos recibidos y gastos
 *   comprometidos (pagados + pendientes).
 */

import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseCategories,
  expenses,
  financialProfiles,
  income,
  incomeCategories,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { MinorUnits } from "./money";
import {
  isExpenseStatus,
  isIncomeStatus,
  isPeriodId,
  isPresupuestoTab,
} from "./presupuesto-shared";
import type {
  CategoryView,
  MovementRow,
  PeriodId,
  PresupuestoData as SharedPresupuestoData,
  PresupuestoSummary,
  PresupuestoTab,
} from "./presupuesto-shared";

export type {
  CategoryView,
  ExpenseStatus,
  IncomeStatus,
  MovementRow,
  PeriodId,
  PresupuestoFilters,
  PresupuestoSummary,
  PresupuestoTab,
} from "./presupuesto-shared";
export {
  isExpenseStatus,
  isIncomeStatus,
  isPeriodId,
  isPresupuestoTab,
  PERIOD_IDS,
  TAB_IDS,
} from "./presupuesto-shared";
export type { SharedPresupuestoData };

/** Vista del módulo con la moneda tipada (solo servidor). */
export interface PresupuestoData extends Omit<SharedPresupuestoData, "currency"> {
  currency: CurrencyCode;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

export function decimalToMinor(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Límites del período en UTC (fechas `occurred_on` son dates sin zona). */
export function periodBounds(period: PeriodId, now = new Date()): { from: string | null; to: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const endCurrent = isoDate(new Date(Date.UTC(y, m + 1, 0)));

  switch (period) {
    case "this_month":
      return { from: isoDate(new Date(Date.UTC(y, m, 1))), to: endCurrent };
    case "last_month":
      return {
        from: isoDate(new Date(Date.UTC(y, m - 1, 1))),
        to: isoDate(new Date(Date.UTC(y, m, 0))),
      };
    case "last_3":
      return { from: isoDate(new Date(Date.UTC(y, m - 2, 1))), to: endCurrent };
    case "last_6":
      return { from: isoDate(new Date(Date.UTC(y, m - 5, 1))), to: endCurrent };
    default:
      return { from: null, to: endCurrent };
  }
}

/* ── Consulta principal ─────────────────────────────────────────────── */

export async function getPresupuestoData(
  userId: string,
  params: { tab?: string; p?: string; cat?: string; tipo?: string; estado?: string },
): Promise<PresupuestoData | null> {
  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;

  const currency = profile.baseCurrency as CurrencyCode;
  const tab = isPresupuestoTab(params.tab) ? params.tab : "ingresos";
  const period = isPeriodId(params.p) ? params.p : "this_month";
  const categoryId = typeof params.cat === "string" ? params.cat : "";
  const kindFilter = params.tipo === "fixed" || params.tipo === "variable" ? params.tipo : "";
  const statusFilter = typeof params.estado === "string" ? params.estado : "";

  const { from, to } = periodBounds(period);

  /* Resumen del período (ingresos recibidos; gastos comprometidos). */
  const dateRange = [
    eq(income.userId, userId),
    eq(income.currency, currency),
    isNull(income.deletedAt),
    lte(income.occurredOn, to),
    ...(from ? [gte(income.occurredOn, from)] : []),
  ];
  const [incomeAgg, expenseAgg] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${income.amount}), 0)` })
      .from(income)
      .where(and(...dateRange, eq(income.status, "received"))),
    db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.currency, currency),
          isNull(expenses.deletedAt),
          lte(expenses.occurredOn, to),
          ...(from ? [gte(expenses.occurredOn, from)] : []),
          sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
        ),
      ),
  ]);

  const incomeReceived = decimalToMinor(incomeAgg[0]?.total);
  const expensesCommitted = decimalToMinor(expenseAgg[0]?.total);
  const balance = incomeReceived - expensesCommitted;
  const summary: PresupuestoSummary = {
    incomeReceived,
    expensesCommitted,
    savings: Math.max(0, balance),
    balance,
  };

  /* Categorías del usuario (para filtros y formularios). */
  const [incomeCatRows, expenseCatRows] = await Promise.all([
    db
      .select({
        id: incomeCategories.id,
        name: incomeCategories.name,
        isSystem: incomeCategories.isSystem,
      })
      .from(incomeCategories)
      .where(
        and(
          eq(incomeCategories.userId, userId),
          eq(incomeCategories.status, "active"),
          isNull(incomeCategories.deletedAt),
        ),
      )
      .orderBy(incomeCategories.sortOrder, incomeCategories.name),
    db
      .select({
        id: expenseCategories.id,
        name: expenseCategories.name,
        kind: expenseCategories.kind,
        isSystem: expenseCategories.isSystem,
      })
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.userId, userId),
          eq(expenseCategories.status, "active"),
          isNull(expenseCategories.deletedAt),
        ),
      )
      .orderBy(expenseCategories.sortOrder, expenseCategories.name),
  ]);

  const categories = {
    income: incomeCatRows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: null,
      isSystem: row.isSystem,
    })),
    expense: expenseCatRows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind as "fixed" | "variable",
      isSystem: row.isSystem,
    })),
  };

  /* Lista de la pestaña activa con filtros. */
  let rows: MovementRow[] = [];

  if (tab === "ingresos") {
    const incomeRows = await db
      .select({
        id: income.id,
        description: income.description,
        occurredOn: income.occurredOn,
        amount: income.amount,
        categoryId: income.categoryId,
        status: income.status,
        recurringId: income.recurringId,
        category: { name: incomeCategories.name },
      })
      .from(income)
      .leftJoin(incomeCategories, eq(income.categoryId, incomeCategories.id))
      .where(
        and(
          eq(income.userId, userId),
          eq(income.currency, currency),
          isNull(income.deletedAt),
          lte(income.occurredOn, to),
          ...(from ? [gte(income.occurredOn, from)] : []),
          ...(categoryId ? [eq(income.categoryId, categoryId)] : []),
          ...(statusFilter && isIncomeStatus(statusFilter)
            ? [eq(income.status, statusFilter)]
            : []),
        ),
      )
      .orderBy(desc(income.occurredOn), desc(income.createdAt))
      .limit(200);

    rows = incomeRows.map((row) => ({
      id: row.id,
      table: "income" as const,
      description: row.description,
      date: String(row.occurredOn),
      amountMinor: decimalToMinor(row.amount),
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      kind: null,
      status: row.status,
      note: null,
      isRecurring: Boolean(row.recurringId),
    }));
  } else {
    const tabKind = tab === "fijos" ? "fixed" : "variable";
    const expenseRows = await db
      .select({
        id: expenses.id,
        description: expenses.description,
        occurredOn: expenses.occurredOn,
        amount: expenses.amount,
        categoryId: expenses.categoryId,
        kind: expenses.kind,
        status: expenses.status,
        note: expenses.note,
        recurringId: expenses.recurringId,
        category: { name: expenseCategories.name },
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.currency, currency),
          isNull(expenses.deletedAt),
          lte(expenses.occurredOn, to),
          ...(from ? [gte(expenses.occurredOn, from)] : []),
          ...(categoryId ? [eq(expenses.categoryId, categoryId)] : []),
          ...(statusFilter && isExpenseStatus(statusFilter)
            ? [eq(expenses.status, statusFilter)]
            : []),
        ),
      )
      .orderBy(desc(expenses.occurredOn), desc(expenses.createdAt))
      .limit(200);

    rows = expenseRows
      .map((row) => ({
        id: row.id,
        table: "expenses" as const,
        description: row.description,
        date: String(row.occurredOn),
        amountMinor: decimalToMinor(row.amount),
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        kind: (row.kind ?? "variable") as "fixed" | "variable",
        status: row.status,
        note: row.note,
        isRecurring: Boolean(row.recurringId),
      }))
      .filter((row) => {
        // La pestaña fija el tipo; sin categoría el gasto cuenta como variable.
        if (row.kind !== tabKind) return false;
        if (kindFilter && row.kind !== kindFilter) return false;
        return true;
      });
  }

  const hasActiveFilters = Boolean(categoryId || kindFilter || statusFilter || period !== "this_month");

  return {
    currency,
    tab,
    rows,
    summary,
    filters: { period, categoryId, kind: kindFilter, status: statusFilter },
    categories,
    hasActiveFilters,
  };
}
