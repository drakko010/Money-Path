/**
 * Money Path™ (Etapa 16) — SOLO SERVIDOR.
 *
 * Recolecta los datos financieros REALES del usuario (ingresos, gastos,
 * gastos esenciales, deudas, ahorro, fondo de emergencia, metas, inversiones
 * y patrimonio) y construye la ruta de acción con la lógica pura de
 * `moneypath-shared`. No inventa datos: si algo no existe, se marca como
 * estimado o se omite.
 */

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  debts,
  emergencyFunds,
  expenses,
  financialProfiles,
  goals,
  income,
  investments,
  moneyPathStates,
  netWorthSnapshots,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { computeEssentialMonthly } from "./fondo";
import { monthsUntil } from "./goals-shared";
import {
  analyzeMoneyPath,
  planForFinding,
  type GoalLite,
  type MoneyPathInput,
  type MoneyPathView,
} from "./moneypath-shared";

export function minorOf(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export interface MoneyPathData extends MoneyPathView {
  currency: CurrencyCode;
}

const WINDOW_MONTHS = 3;

export async function getMoneyPathData(userId: string): Promise<MoneyPathData | null> {
  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;
  const currency = profile.baseCurrency as CurrencyCode;

  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (WINDOW_MONTHS - 1), 1))
    .toISOString()
    .slice(0, 10);

  // Movimientos reales (últimos 3 meses).
  const [incomeAgg, expenseAgg] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${income.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(income)
      .where(
        and(
          eq(income.userId, userId),
          eq(income.currency, currency),
          eq(income.status, "received"),
          isNull(income.deletedAt),
          gte(income.occurredOn, windowStart),
        ),
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.currency, currency),
          sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
          isNull(expenses.deletedAt),
          gte(expenses.occurredOn, windowStart),
        ),
      ),
  ]);

  const incomeCount = Number(incomeAgg[0]?.count ?? 0);
  const expenseCount = Number(expenseAgg[0]?.count ?? 0);
  const hasActualData = incomeCount + expenseCount > 0;

  const monthlyIncomeMinor = hasActualData
    ? Math.round(minorOf(incomeAgg[0]?.total) / WINDOW_MONTHS)
    : minorOf(profile.monthlyIncome);
  const monthlyExpensesMinor = hasActualData
    ? Math.round(minorOf(expenseAgg[0]?.total) / WINDOW_MONTHS)
    : minorOf(profile.monthlyFixedExpenses);

  // Gasto esencial (categorías esenciales; fallback al gasto total).
  const essential = await computeEssentialMonthly(userId, currency);
  const essentialMonthlyMinor = essential.minor > 0 ? essential.minor : monthlyExpensesMinor;

  // Deudas activas: total, mayor tasa y su nombre.
  const debtRows = await db
    .select({
      name: debts.name,
      balance: debts.outstandingBalance,
      rate: debts.annualInterestRate,
    })
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, "active"), isNull(debts.deletedAt)));
  const debtsTotalMinor = debtRows.reduce((acc, row) => acc + minorOf(row.balance), 0);
  let topDebtRate: number | null = null;
  let topDebtName: string | null = null;
  for (const row of debtRows) {
    const rate = row.rate === null ? null : Number(row.rate);
    if (rate !== null && Number.isFinite(rate) && (topDebtRate === null || rate > topDebtRate)) {
      topDebtRate = rate;
      topDebtName = row.name;
    }
  }

  // Fondo de emergencia.
  const targetMonths = Number(profile.emergencyFundTargetMonths ?? 6) || 6;
  const fundRows = await db
    .select({ current: emergencyFunds.currentAmount, target: emergencyFunds.targetAmount })
    .from(emergencyFunds)
    .where(and(eq(emergencyFunds.userId, userId), isNull(emergencyFunds.deletedAt)))
    .orderBy(desc(emergencyFunds.createdAt))
    .limit(1);
  const fundCurrentMinor = minorOf(fundRows[0]?.current);
  const fundTargetMinor =
    minorOf(fundRows[0]?.target) > 0 ? minorOf(fundRows[0].target) : essentialMonthlyMinor * targetMonths;

  // Metas activas.
  const goalRows = await db
    .select({
      name: goals.name,
      target: goals.targetAmount,
      current: goals.currentAmount,
      targetDate: goals.targetDate,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active"), isNull(goals.deletedAt)));
  const goalLites: GoalLite[] = goalRows.map((row) => ({
    name: row.name,
    targetMinor: minorOf(row.target),
    currentMinor: minorOf(row.current),
    monthsLeft: row.targetDate ? monthsUntil(String(row.targetDate), now) : null,
  }));

  // Inversiones activas.
  const investmentRows = await db
    .select({ invested: investments.investedAmount, current: investments.currentValue })
    .from(investments)
    .where(and(eq(investments.userId, userId), eq(investments.currency, currency), eq(investments.status, "active"), isNull(investments.deletedAt)));
  const investmentsCurrentMinor = investmentRows.reduce(
    (acc, row) => acc + (row.current === null ? minorOf(row.invested) : minorOf(row.current)),
    0,
  );

  // Patrimonio: último snapshot y variación contra el previo.
  const snapshotRows = await db
    .select({ netWorth: netWorthSnapshots.netWorth, snapshotDate: netWorthSnapshots.snapshotDate })
    .from(netWorthSnapshots)
    .where(and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.currency, currency)))
    .orderBy(desc(netWorthSnapshots.snapshotDate))
    .limit(2);
  const netWorthMinor = minorOf(snapshotRows[0]?.netWorth);
  const netWorthVariationMinor =
    snapshotRows.length >= 2 ? minorOf(snapshotRows[0].netWorth) - minorOf(snapshotRows[1].netWorth) : null;

  const savingsMinor = fundCurrentMinor + investmentsCurrentMinor;

  const input: MoneyPathInput = {
    currency,
    monthlyIncomeMinor,
    monthlyExpensesMinor,
    essentialMonthlyMinor,
    surplusMinor: monthlyIncomeMinor - monthlyExpensesMinor,
    debtsTotalMinor,
    topDebtRate,
    topDebtName,
    fundCurrentMinor,
    fundTargetMinor,
    goals: goalLites,
    investmentsCurrentMinor,
    savingsMinor,
    netWorthMinor,
    netWorthVariationMinor,
    hasActualData,
  };

  const findings = analyzeMoneyPath(input);
  const priority = findings[0];
  const plan = planForFinding(input, priority);

  return { currency, input, findings, priority, plan };
}

/** Persiste un estado de la ruta (máximo uno por día) para auditoría. */
export async function recordMoneyPathState(userId: string, data: MoneyPathData): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db
    .select({ id: moneyPathStates.id })
    .from(moneyPathStates)
    .where(and(eq(moneyPathStates.userId, userId), sql`date(${moneyPathStates.createdAt}) = ${today}`))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(moneyPathStates).values({
    userId,
    source: "auto",
    state: {
      currency: data.currency,
      monthlyIncomeMinor: data.input.monthlyIncomeMinor,
      monthlyExpensesMinor: data.input.monthlyExpensesMinor,
      surplusMinor: data.input.surplusMinor,
      debtsTotalMinor: data.input.debtsTotalMinor,
      fundCurrentMinor: data.input.fundCurrentMinor,
      netWorthMinor: data.input.netWorthMinor,
      priorityType: data.priority.type,
      prioritySeverity: data.priority.severity,
      findingTypes: data.findings.map((finding) => finding.type),
      hasActualData: data.input.hasActualData,
      generatedOn: today,
    },
  });
}
