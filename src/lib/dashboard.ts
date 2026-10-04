/**
 * Datos del dashboard (Etapa 6) — SOLO SERVIDOR.
 *
 * Reglas:
 * - Toda consulta filtra por el usuario de la sesión.
 * - Se consultan movimientos reales; si aún no existen, se usa el
 *   diagnóstico del onboarding y se marca como "estimado" (nunca mock).
 * - Solo se consideran movimientos en la moneda base del usuario:
 *   jamás se suman monedas distintas silenciosamente.
 * - Todo monto viaja en centavos (MinorUnits).
 */

import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  debts,
  emergencyFunds,
  expenseCategories,
  expenses,
  financialProfiles,
  goals,
  income,
  netWorthSnapshots,
  userSettings,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { OnboardingGoal } from "@/config/onboarding";
import { computeEssentialMonthly } from "./fondo";
import type { MinorUnits } from "./money";

export const INDICATOR_IDS = [
  "ingresos",
  "gastos",
  "saldo",
  "ahorro",
  "deudas",
  "fondo",
  "patrimonio",
] as const;

export type IndicatorId = (typeof INDICATOR_IDS)[number];

export function isIndicatorId(value: string): value is IndicatorId {
  return (INDICATOR_IDS as readonly string[]).includes(value);
}

export const DASHBOARD_SETTINGS_KEY = "dashboard.indicators";

export interface MonthPoint {
  /** "2026-09" */
  key: string;
  /** Etiqueta corta ("sep"). */
  label: string;
  income: MinorUnits;
  expenses: MinorUnits;
}

export interface ExpenseSlice {
  name: string;
  amount: MinorUnits;
}

export interface GoalView {
  name: string;
  current: MinorUnits;
  target: MinorUnits;
  /** true si la meta se deriva del diagnóstico (aún no hay metas creadas). */
  derived: boolean;
}

export interface DashboardData {
  currency: CurrencyCode;
  onboardingCompleted: boolean;
  primaryGoal: OnboardingGoal | null;

  monthlyBalanceEstimate: MinorUnits;
  reserveTarget: MinorUnits;

  incomeMonth: { amount: MinorUnits; estimated: boolean };
  expensesMonth: { amount: MinorUnits; estimated: boolean };
  balance: MinorUnits;
  savingsInvestment: MinorUnits;
  debtsTotal: { amount: MinorUnits; hasDebts: boolean };
  emergencyFund: { current: MinorUnits; target: MinorUnits };
  netWorth: { amount: MinorUnits; estimated: boolean };

  series: MonthPoint[];
  hasMovements: boolean;
  expenseDistribution: ExpenseSlice[];
  netWorthHistory: Array<{ date: string; amount: MinorUnits }>;
  goalsView: GoalView[];
  visibleIndicators: IndicatorId[];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function decimalToMinor(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  timeZone: "UTC",
});

/* ── Preferencias (indicadores visibles) ───────────────────────────── */

export async function getVisibleIndicators(userId: string): Promise<IndicatorId[]> {
  const rows = await db
    .select()
    .from(userSettings)
    .where(
      and(eq(userSettings.userId, userId), eq(userSettings.key, DASHBOARD_SETTINGS_KEY)),
    )
    .limit(1);

  const stored = rows[0]?.value as { visible?: unknown } | null;
  if (stored && Array.isArray(stored.visible)) {
    const valid = stored.visible.filter(
      (entry): entry is IndicatorId =>
        typeof entry === "string" && isIndicatorId(entry),
    );
    if (valid.length > 0) return valid;
  }
  return [...INDICATOR_IDS];
}

export async function setVisibleIndicators(
  userId: string,
  visible: IndicatorId[],
): Promise<void> {
  const value = { visible };
  await db
    .insert(userSettings)
    .values({ userId, key: DASHBOARD_SETTINGS_KEY, value })
    .onConflictDoUpdate({
      target: [userSettings.userId, userSettings.key],
      set: { value },
    });
}

/* ── Agregado principal ─────────────────────────────────────────────── */

export async function getDashboardData(userId: string): Promise<DashboardData | null> {
  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;

  const currency = profile.baseCurrency as CurrencyCode;
  const monthlyIncomeEstimate = decimalToMinor(profile.monthlyIncome);
  const monthlyExpensesEstimate = decimalToMinor(profile.monthlyFixedExpenses);
  const targetMonths = Number(profile.emergencyFundTargetMonths ?? "6");

  // Base del fondo: gasto esencial calculado (Etapa 11); si aún no hay
  // categorías esenciales ni ajuste manual, se usa el estimado del diagnóstico.
  const essentialMonthly = (await computeEssentialMonthly(userId, currency)).minor;
  const reserveBase = essentialMonthly > 0 ? essentialMonthly : monthlyExpensesEstimate;
  const reserveTarget = Math.round(reserveBase * (Number.isFinite(targetMonths) ? targetMonths : 6));

  const now = new Date();
  const currentMonthStart = `${monthKey(now)}-01`;

  const firstSeriesDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const seriesStart = `${monthKey(firstSeriesDate)}-01`;

  /* Movimientos reales del período (solo moneda base). */
  const [incomeRows, expenseRows, debtsRows, fundRows, snapshotRows, goalRows] =
    await Promise.all([
      db
        .select({ amount: income.amount, occurredOn: income.occurredOn })
        .from(income)
        .where(
          and(
            eq(income.userId, userId),
            eq(income.currency, currency),
            isNull(income.deletedAt),
            sql`${income.status} != 'cancelled'`,
            gte(income.occurredOn, seriesStart),
          ),
        ),
      db
        .select({
          amount: expenses.amount,
          occurredOn: expenses.occurredOn,
          categoryId: expenses.categoryId,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.currency, currency),
            isNull(expenses.deletedAt),
            sql`${expenses.status} != 'cancelled'`,
            gte(expenses.occurredOn, seriesStart),
          ),
        ),
      db
        .select({ balance: debts.outstandingBalance })
        .from(debts)
        .where(
          and(
            eq(debts.userId, userId),
            eq(debts.currency, currency),
            isNull(debts.deletedAt),
            eq(debts.status, "active"),
          ),
        ),
      db
        .select({ current: emergencyFunds.currentAmount, target: emergencyFunds.targetAmount })
        .from(emergencyFunds)
        .where(
          and(
            eq(emergencyFunds.userId, userId),
            eq(emergencyFunds.currency, currency),
            isNull(emergencyFunds.deletedAt),
          ),
        )
        .orderBy(desc(emergencyFunds.createdAt))
        .limit(1),
      db
        .select({ date: netWorthSnapshots.snapshotDate, amount: netWorthSnapshots.netWorth })
        .from(netWorthSnapshots)
        .where(
          and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.currency, currency)),
        )
        .orderBy(asc(netWorthSnapshots.snapshotDate)),
      db
        .select({
          name: goals.name,
          current: goals.currentAmount,
          target: goals.targetAmount,
          status: goals.status,
        })
        .from(goals)
        .where(
          and(
            eq(goals.userId, userId),
            eq(goals.currency, currency),
            isNull(goals.deletedAt),
            eq(goals.status, "active"),
          ),
        )
        .orderBy(desc(goals.createdAt))
        .limit(6),
    ]);

  /* Serie de 6 meses: ingresos vs gastos. */
  const series: MonthPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = monthKey(date);
    series.push({
      key,
      label: MONTH_LABEL_FORMAT.format(date).replace(".", ""),
      income: 0,
      expenses: 0,
    });
  }
  const pointByKey = new Map(series.map((point) => [point.key, point]));
  for (const row of incomeRows) {
    const point = pointByKey.get(String(row.occurredOn).slice(0, 7));
    if (point) point.income += decimalToMinor(row.amount);
  }
  for (const row of expenseRows) {
    const point = pointByKey.get(String(row.occurredOn).slice(0, 7));
    if (point) point.expenses += decimalToMinor(row.amount);
  }
  const hasMovements = incomeRows.length > 0 || expenseRows.length > 0;

  const incomeMonthReal = series[series.length - 1].income;
  const expensesMonthReal = series[series.length - 1].expenses;
  const hasIncomeThisMonth = incomeRows.some(
    (row) => String(row.occurredOn).slice(0, 7) === monthKey(now),
  );
  const hasExpensesThisMonth = expenseRows.some(
    (row) => String(row.occurredOn).slice(0, 7) === monthKey(now),
  );

  const incomeMonth = hasIncomeThisMonth
    ? { amount: incomeMonthReal, estimated: false }
    : { amount: monthlyIncomeEstimate, estimated: true };
  const expensesMonth = hasExpensesThisMonth
    ? { amount: expensesMonthReal, estimated: false }
    : { amount: monthlyExpensesEstimate, estimated: true };

  /* Distribución de gastos del mes (con nombre de categoría). */
  const monthExpenses = expenseRows.filter(
    (row) => String(row.occurredOn).slice(0, 7) === monthKey(now),
  );
  let expenseDistribution: ExpenseSlice[] = [];
  if (monthExpenses.length > 0) {
    const categoryIds = Array.from(
      new Set(monthExpenses.map((row) => row.categoryId).filter((id): id is string => Boolean(id))),
    );
    const categoryRows =
      categoryIds.length > 0
        ? await db
            .select({ id: expenseCategories.id, name: expenseCategories.name })
            .from(expenseCategories)
            .where(and(eq(expenseCategories.userId, userId), sql`${expenseCategories.id} IN (${sql.join(
              categoryIds.map((id) => sql`${id}`),
              sql`, `,
            )})`))
        : [];
    const nameById = new Map(categoryRows.map((row) => [row.id, row.name]));

    const totals = new Map<string, MinorUnits>();
    for (const row of monthExpenses) {
      const name = row.categoryId ? (nameById.get(row.categoryId) ?? "Sin categoría") : "Sin categoría";
      totals.set(name, (totals.get(name) ?? 0) + decimalToMinor(row.amount));
    }
    expenseDistribution = Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  /* Indicadores. */
  const debtsTotal =
    debtsRows.length > 0
      ? {
          amount: debtsRows.reduce((acc, row) => acc + decimalToMinor(row.balance), 0),
          hasDebts: true,
        }
      : {
          amount: decimalToMinor(profile.totalDebts),
          hasDebts: Boolean(profile.hasDebts),
        };

  const fundRow = fundRows[0];
  const emergencyFund = fundRow
    ? {
        current: decimalToMinor(fundRow.current),
        target: decimalToMinor(fundRow.target),
      }
    : {
        current: decimalToMinor(profile.currentReserve),
        target: reserveTarget,
      };

  const snapshotRow = snapshotRows[snapshotRows.length - 1];
  const netWorth = snapshotRow
    ? { amount: decimalToMinor(snapshotRow.amount), estimated: false }
    : { amount: decimalToMinor(profile.approximateNetWorth), estimated: true };

  const netWorthHistory = snapshotRows.map((row) => ({
    date: String(row.date),
    amount: decimalToMinor(row.amount),
  }));
  if (netWorthHistory.length === 0) {
    netWorthHistory.push({
      date: String(profile.onboardingCompletedAt.toISOString().slice(0, 10)),
      amount: netWorth.amount,
    });
  }

  /* Progreso de metas: reales o derivadas del objetivo del diagnóstico. */
  let goalsView: GoalView[] = goalRows.map((row) => ({
    name: row.name,
    current: decimalToMinor(row.current),
    target: decimalToMinor(row.target),
    derived: false,
  }));
  if (goalsView.length === 0 && profile.primaryGoal) {
    const goal = profile.primaryGoal as OnboardingGoal;
    if (goal === "crear_reserva" || goal === "ahorrar" || goal === "viajar" || goal === "comprar_algo") {
      goalsView = [
        {
          name: "diag-reserva",
          current: emergencyFund.current,
          target: emergencyFund.target,
          derived: true,
        },
      ];
    } else if (goal === "salir_deudas") {
      goalsView = [
        {
          name: "diag-deudas",
          // Sin pagos registrados aún: el avance real empieza en cero.
          current: 0,
          target: debtsTotal.amount,
          derived: true,
        },
      ];
    } else if (goal === "invertir" || goal === "patrimonio") {
      goalsView = [
        {
          name: "diag-inversion",
          current: decimalToMinor(profile.currentInvestments),
          target: Math.max(decimalToMinor(profile.currentInvestments), monthlyIncomeEstimate * 3),
          derived: true,
        },
      ];
    }
  }

  const visibleIndicators = await getVisibleIndicators(userId);

  return {
    currency,
    onboardingCompleted: true,
    primaryGoal: (profile.primaryGoal as OnboardingGoal | null) ?? null,
    monthlyBalanceEstimate: monthlyIncomeEstimate - monthlyExpensesEstimate,
    reserveTarget,
    incomeMonth,
    expensesMonth,
    balance: incomeMonth.amount - expensesMonth.amount,
    savingsInvestment: decimalToMinor(profile.currentReserve) + decimalToMinor(profile.currentInvestments),
    debtsTotal,
    emergencyFund,
    netWorth,
    series,
    hasMovements,
    expenseDistribution,
    netWorthHistory,
    goalsView,
    visibleIndicators,
  };
}
