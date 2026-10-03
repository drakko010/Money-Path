/**
 * Tipos y constantes del módulo Presupuesto compartidos entre servidor y
 * cliente. Este archivo NO importa drizzle/db: puede usarse con seguridad
 * en componentes de navegador.
 */

import type { MinorUnits } from "./money";

export type PresupuestoTab = "ingresos" | "fijos" | "variables";
export type PeriodId = "this_month" | "last_month" | "last_3" | "last_6" | "all";

export const PERIOD_IDS: PeriodId[] = ["this_month", "last_month", "last_3", "last_6", "all"];
export const TAB_IDS: PresupuestoTab[] = ["ingresos", "fijos", "variables"];

export interface CategoryView {
  id: string;
  name: string;
  kind: "fixed" | "variable" | null;
  isSystem: boolean;
}

export interface MovementRow {
  id: string;
  table: "income" | "expenses";
  description: string;
  date: string;
  amountMinor: MinorUnits;
  categoryId: string | null;
  categoryName: string | null;
  kind: "fixed" | "variable" | null;
  status: string;
  note: string | null;
  isRecurring: boolean;
}

export interface PresupuestoSummary {
  incomeReceived: MinorUnits;
  expensesCommitted: MinorUnits;
  savings: MinorUnits;
  balance: MinorUnits;
}

export interface PresupuestoFilters {
  period: PeriodId;
  categoryId: string;
  kind: string;
  status: string;
}

export interface PresupuestoData {
  currency: string;
  tab: PresupuestoTab;
  rows: MovementRow[];
  summary: PresupuestoSummary;
  filters: PresupuestoFilters;
  categories: { income: CategoryView[]; expense: CategoryView[] };
  hasActiveFilters: boolean;
}

export function isPeriodId(value: string | undefined): value is PeriodId {
  return Boolean(value) && PERIOD_IDS.includes(value as PeriodId);
}

export function isPresupuestoTab(value: string | undefined): value is PresupuestoTab {
  return Boolean(value) && TAB_IDS.includes(value as PresupuestoTab);
}

const INCOME_STATUSES = ["received", "pending", "cancelled"] as const;
const EXPENSE_STATUSES = ["paid", "pending", "cancelled"] as const;

export type IncomeStatus = (typeof INCOME_STATUSES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export function isIncomeStatus(value: string): value is IncomeStatus {
  return (INCOME_STATUSES as readonly string[]).includes(value);
}

export function isExpenseStatus(value: string): value is ExpenseStatus {
  return (EXPENSE_STATUSES as readonly string[]).includes(value);
}
