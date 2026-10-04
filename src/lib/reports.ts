/**
 * Reports & Insights (Etapa 18) — SOLO SERVIDOR.
 *
 * Calcula relatórios por período (1/3/6/12 meses) e gera insights automáticos
 * comparando el período actual contra el anterior. Solo usa datos reales del
 * usuario; si no hay datos, no genera insights falsos.
 */

import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  debts,
  debtPayments,
  expenseCategories,
  expenses,
  financialProfiles,
  income,
  investments,
  netWorthSnapshots,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";

export function minorOf(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export const REPORT_PERIODS = [1, 3, 6, 12] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export function isReportPeriod(value: number): value is ReportPeriod {
  return (REPORT_PERIODS as readonly number[]).includes(value);
}

export interface MonthPoint {
  /** "YYYY-MM" */
  key: string;
  /** Etiqueta corta ("sep"). */
  label: string;
  incomeMinor: number;
  expensesMinor: number;
  savingsMinor: number;
}

export interface CategoryReport {
  name: string;
  currentMinor: number;
  previousMinor: number;
  /** Variación % vs período anterior (null si no hay base). */
  changePct: number | null;
}

export type InsightTone = "positive" | "warning" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  text: string;
}

export interface ReportsData {
  currency: CurrencyCode;
  period: ReportPeriod;
  months: MonthPoint[];
  categories: CategoryReport[];
  totals: {
    incomeMinor: number;
    expensesMinor: number;
    savingsMinor: number;
    prevIncomeMinor: number;
    prevExpensesMinor: number;
    prevSavingsMinor: number;
    incomeChangePct: number | null;
    expensesChangePct: number | null;
    savingsChangePct: number | null;
  };
  debts: { totalMinor: number; activeCount: number; paidInPeriodMinor: number };
  investments: { investedMinor: number; currentMinor: number; gainMinor: number };
  netWorth: { points: MonthPoint[]; latestMinor: number; changeMinor: number | null };
  insights: Insight[];
  hasData: boolean;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });

function monthLabel(key: string): string {
  const parsed = new Date(`${key}-01T00:00:00Z`);
  return MONTH_LABEL.format(parsed).replace(".", "");
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function getReportsData(
  userId: string,
  period: ReportPeriod,
): Promise<ReportsData | null> {
  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency, onboardingCompletedAt: financialProfiles.onboardingCompletedAt })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;
  const currency = profile.baseCurrency as CurrencyCode;

  const now = new Date();
  // Ventana actual: últimos `period` meses (incluye el actual).
  const curStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (period - 1), 1));
  // Ventana anterior: `period` meses previos.
  const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period * 2 + 1, 1));
  const prevEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period + 1, 1));
  const todayIso = now.toISOString().slice(0, 10);

  // Claves de mes de la ventana actual.
  const monthKeys: string[] = [];
  for (let i = period - 1; i >= 0; i -= 1) {
    monthKeys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }

  const [incomeRows, expenseRows, expensePrevRows, incomePrevRows, expenseCatCur, expenseCatPrev] =
    await Promise.all([
      db
        .select({ amount: income.amount, occurredOn: income.occurredOn })
        .from(income)
        .where(
          and(
            eq(income.userId, userId),
            eq(income.currency, currency),
            eq(income.status, "received"),
            isNull(income.deletedAt),
            gte(income.occurredOn, curStart.toISOString().slice(0, 10)),
          ),
        ),
      db
        .select({ amount: expenses.amount, occurredOn: expenses.occurredOn })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.currency, currency),
            sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
            isNull(expenses.deletedAt),
            gte(expenses.occurredOn, curStart.toISOString().slice(0, 10)),
          ),
        ),
      db
        .select({ amount: expenses.amount, occurredOn: expenses.occurredOn })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.currency, currency),
            sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
            isNull(expenses.deletedAt),
            gte(expenses.occurredOn, prevStart.toISOString().slice(0, 10)),
            lt(expenses.occurredOn, prevEnd.toISOString().slice(0, 10)),
          ),
        ),
      db
        .select({ amount: income.amount, occurredOn: income.occurredOn })
        .from(income)
        .where(
          and(
            eq(income.userId, userId),
            eq(income.currency, currency),
            eq(income.status, "received"),
            isNull(income.deletedAt),
            gte(income.occurredOn, prevStart.toISOString().slice(0, 10)),
            lt(income.occurredOn, prevEnd.toISOString().slice(0, 10)),
          ),
        ),
      db
        .select({ name: expenseCategories.name, total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.currency, currency),
            sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
            isNull(expenses.deletedAt),
            gte(expenses.occurredOn, curStart.toISOString().slice(0, 10)),
          ),
        )
        .groupBy(expenses.categoryId, expenseCategories.name),
      db
        .select({ name: expenseCategories.name, total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.currency, currency),
            sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
            isNull(expenses.deletedAt),
            gte(expenses.occurredOn, prevStart.toISOString().slice(0, 10)),
            lt(expenses.occurredOn, prevEnd.toISOString().slice(0, 10)),
          ),
        )
        .groupBy(expenses.categoryId, expenseCategories.name),
    ]);

  // Puntos mensuales.
  const months: MonthPoint[] = monthKeys.map((key) => ({
    key,
    label: monthLabel(key),
    incomeMinor: 0,
    expensesMinor: 0,
    savingsMinor: 0,
  }));
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const row of incomeRows) {
    const point = byKey.get(String(row.occurredOn).slice(0, 7));
    if (point) point.incomeMinor += minorOf(row.amount);
  }
  for (const row of expenseRows) {
    const point = byKey.get(String(row.occurredOn).slice(0, 7));
    if (point) point.expensesMinor += minorOf(row.amount);
  }
  for (const point of months) point.savingsMinor = point.incomeMinor - point.expensesMinor;

  // Totales ventana actual vs anterior.
  const incomeMinor = months.reduce((acc, m) => acc + m.incomeMinor, 0);
  const expensesMinor = months.reduce((acc, m) => acc + m.expensesMinor, 0);
  const savingsMinor = incomeMinor - expensesMinor;
  const prevIncomeMinor = incomePrevRows.reduce((acc, r) => acc + minorOf(r.amount), 0);
  const prevExpensesMinor = expensePrevRows.reduce((acc, r) => acc + minorOf(r.amount), 0);
  const prevSavingsMinor = prevIncomeMinor - prevExpensesMinor;

  // Categorías con comparación.
  const curByName = new Map(expenseCatCur.map((r) => [r.name ?? "Sin categoría", minorOf(r.total)]));
  const prevByName = new Map(expenseCatPrev.map((r) => [r.name ?? "Sin categoría", minorOf(r.total)]));
  const categoryNames = Array.from(new Set([...curByName.keys(), ...prevByName.keys()]));
  const categories: CategoryReport[] = categoryNames
    .map((name) => {
      const currentMinor = curByName.get(name) ?? 0;
      const previousMinor = prevByName.get(name) ?? 0;
      return { name, currentMinor, previousMinor, changePct: pctChange(currentMinor, previousMinor) };
    })
    .sort((a, b) => b.currentMinor - a.currentMinor);

  // Deudas: total actual + pagos en el período.
  const [debtRows, debtPaidRows] = await Promise.all([
    db
      .select({ balance: debts.outstandingBalance })
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.status, "active"), isNull(debts.deletedAt))),
    db
      .select({ amount: debtPayments.amount })
      .from(debtPayments)
      .where(
        and(
          eq(debtPayments.userId, userId),
          isNull(debtPayments.deletedAt),
          gte(debtPayments.paidOn, curStart.toISOString().slice(0, 10)),
        ),
      ),
  ]);
  const debtsTotalMinor = debtRows.reduce((acc, r) => acc + minorOf(r.balance), 0);
  const paidInPeriodMinor = debtPaidRows.reduce((acc, r) => acc + minorOf(r.amount), 0);

  // Inversiones.
  const investmentRows = await db
    .select({ invested: investments.investedAmount, current: investments.currentValue })
    .from(investments)
    .where(
      and(eq(investments.userId, userId), eq(investments.currency, currency), eq(investments.status, "active"), isNull(investments.deletedAt)),
    );
  const investedMinor = investmentRows.reduce((acc, r) => acc + minorOf(r.invested), 0);
  const currentMinor = investmentRows.reduce((acc, r) => acc + (r.current === null ? minorOf(r.invested) : minorOf(r.current)), 0);
  const gainMinor = currentMinor - investedMinor;

  // Patrimonio: snapshots dentro de la ventana.
  const snapshotRows = await db
    .select({ netWorth: netWorthSnapshots.netWorth, snapshotDate: netWorthSnapshots.snapshotDate })
    .from(netWorthSnapshots)
    .where(and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.currency, currency)))
    .orderBy(netWorthSnapshots.snapshotDate);
  const windowStartIso = prevStart.toISOString().slice(0, 10);
  const netWorthPoints: MonthPoint[] = [];
  const nwByMonth = new Map<string, number>();
  for (const row of snapshotRows) {
    const key = String(row.snapshotDate).slice(0, 7);
    nwByMonth.set(key, minorOf(row.netWorth));
  }
  for (const key of monthKeys) {
    if (nwByMonth.has(key)) {
      netWorthPoints.push({ key, label: monthLabel(key), incomeMinor: 0, expensesMinor: 0, savingsMinor: nwByMonth.get(key) as number });
    }
  }
  const latestMinor = snapshotRows.length > 0 ? minorOf(snapshotRows[snapshotRows.length - 1].netWorth) : 0;
  const netWorthChangeMinor =
    snapshotRows.length >= 2
      ? minorOf(snapshotRows[snapshotRows.length - 1].netWorth) - minorOf(snapshotRows[0].netWorth)
      : null;

  const hasData = incomeRows.length + expenseRows.length > 0;

  const data: ReportsData = {
    currency,
    period,
    months,
    categories,
    totals: {
      incomeMinor,
      expensesMinor,
      savingsMinor,
      prevIncomeMinor,
      prevExpensesMinor,
      prevSavingsMinor,
      incomeChangePct: pctChange(incomeMinor, prevIncomeMinor),
      expensesChangePct: pctChange(expensesMinor, prevExpensesMinor),
      savingsChangePct: pctChange(savingsMinor, prevSavingsMinor),
    },
    debts: { totalMinor: debtsTotalMinor, activeCount: debtRows.length, paidInPeriodMinor },
    investments: { investedMinor, currentMinor, gainMinor },
    netWorth: { points: netWorthPoints, latestMinor, changeMinor: netWorthChangeMinor },
    insights: [],
    hasData,
  };

  return data;
}

/** Genera insights automáticos a partir de los datos del informe. */
export function buildInsights(
  data: ReportsData,
  templates: {
    categoryUp: string;
    categoryDown: string;
    savingsUp: string;
    savingsDown: string;
    netWorthUp: string;
    netWorthDown: string;
    debtPaid: string;
    investmentGain: string;
    incomeUp: string;
    incomeDown: string;
  },
  fmt: (minor: number) => string,
): Insight[] {
  const insights: Insight[] = [];
  const fill = (template: string, vars: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");

  // 1) Mayor aumento de gasto por categoría (≥10% y monto relevante).
  const increased = data.categories
    .filter((c) => c.changePct !== null && c.changePct >= 10 && c.currentMinor >= 50000)
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
  if (increased) {
    insights.push({
      id: "category-up",
      tone: "warning",
      text: fill(templates.categoryUp, { category: increased.name, pct: (increased.changePct ?? 0).toFixed(0) }),
    });
  }

  // 2) Mayor reducción de gasto por categoría.
  const decreased = data.categories
    .filter((c) => c.changePct !== null && c.changePct <= -10 && c.previousMinor >= 50000)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0];
  if (decreased) {
    insights.push({
      id: "category-down",
      tone: "positive",
      text: fill(templates.categoryDown, { category: decreased.name, pct: Math.abs(decreased.changePct ?? 0).toFixed(0) }),
    });
  }

  // 3) Ahorro del período vs anterior.
  if (data.totals.savingsChangePct !== null && data.totals.prevSavingsMinor > 0) {
    if (data.totals.savingsMinor > data.totals.prevSavingsMinor) {
      insights.push({
        id: "savings-up",
        tone: "positive",
        text: fill(templates.savingsUp, { amount: fmt(data.totals.savingsMinor), prev: fmt(data.totals.prevSavingsMinor) }),
      });
    } else if (data.totals.savingsMinor < data.totals.prevSavingsMinor) {
      insights.push({
        id: "savings-down",
        tone: "warning",
        text: fill(templates.savingsDown, { amount: fmt(data.totals.savingsMinor), prev: fmt(data.totals.prevSavingsMinor) }),
      });
    }
  }

  // 4) Patrimonio.
  if (data.netWorth.changeMinor !== null) {
    if (data.netWorth.changeMinor > 0) {
      insights.push({ id: "networth-up", tone: "positive", text: fill(templates.netWorthUp, { amount: fmt(data.netWorth.changeMinor) }) });
    } else if (data.netWorth.changeMinor < 0) {
      insights.push({ id: "networth-down", tone: "warning", text: fill(templates.netWorthDown, { amount: fmt(Math.abs(data.netWorth.changeMinor)) }) });
    }
  }

  // 5) Pagos a deudas en el período.
  if (data.debts.paidInPeriodMinor > 0) {
    insights.push({ id: "debt-paid", tone: "positive", text: fill(templates.debtPaid, { amount: fmt(data.debts.paidInPeriodMinor) }) });
  }

  // 6) Ganancia de inversiones.
  if (data.investments.gainMinor > 0) {
    insights.push({ id: "investment-gain", tone: "positive", text: fill(templates.investmentGain, { amount: fmt(data.investments.gainMinor) }) });
  }

  // 7) Ingresos vs período anterior.
  if (data.totals.incomeChangePct !== null) {
    if (data.totals.incomeChangePct >= 5) {
      insights.push({ id: "income-up", tone: "positive", text: fill(templates.incomeUp, { pct: data.totals.incomeChangePct.toFixed(0) }) });
    } else if (data.totals.incomeChangePct <= -5) {
      insights.push({ id: "income-down", tone: "warning", text: fill(templates.incomeDown, { pct: Math.abs(data.totals.incomeChangePct).toFixed(0) }) });
    }
  }

  return insights;
}
