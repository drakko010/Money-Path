/**
 * Money AI (Etapa 17) — SOLO SERVIDOR.
 * Construye el contexto financiero REAL del usuario. Solo se leen datos
 * existentes; nunca se generan valores ficticios.
 */

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
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
  profiles,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { monthsUntil } from "@/lib/goals-shared";
import type { AIGoalInfo, AIContext, AISpendByCategory } from "./types";

export function minorOf(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

const WINDOW_MONTHS = 3;

export async function buildAIContext(userId: string): Promise<AIContext | null> {
  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;
  const currency = profile.baseCurrency as CurrencyCode;

  const profileName = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const userName = profileName[0]?.displayName ?? "";

  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (WINDOW_MONTHS - 1), 1))
    .toISOString()
    .slice(0, 10);
  const monthStart = `${now.toISOString().slice(0, 7)}-01`;
  const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(now);

  // Ingresos/gastos promedio (últimos 3 meses) con fallback al diagnóstico.
  const [incomeAgg, expenseAgg] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${income.amount}), 0)`, count: sql<number>`count(*)::int` })
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
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)`, count: sql<number>`count(*)::int` })
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
  const hasActualData = Number(incomeAgg[0]?.count ?? 0) + Number(expenseAgg[0]?.count ?? 0) > 0;
  const monthlyIncomeMinor = hasActualData
    ? Math.round(minorOf(incomeAgg[0]?.total) / WINDOW_MONTHS)
    : minorOf(profile.monthlyIncome);
  const monthlyExpensesMinor = hasActualData
    ? Math.round(minorOf(expenseAgg[0]?.total) / WINDOW_MONTHS)
    : minorOf(profile.monthlyFixedExpenses);

  // Gastos del mes actual por categoría.
  const expenseMonthRows = await db
    .select({ name: expenseCategories.name, total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.currency, currency),
        sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
        isNull(expenses.deletedAt),
        gte(expenses.occurredOn, monthStart),
      ),
    )
    .groupBy(expenses.categoryId, expenseCategories.name)
    .orderBy(desc(sql`sum(${expenses.amount})`));
  const spendByCategory: AISpendByCategory[] = expenseMonthRows.map((row) => ({
    name: row.name ?? "Sin categoría",
    totalMinor: minorOf(row.total),
  }));
  const biggestExpense = spendByCategory.length > 0 ? spendByCategory[0] : null;

  // Deudas activas.
  const debtRows = await db
    .select({ balance: debts.outstandingBalance })
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, "active"), isNull(debts.deletedAt)));
  const debtsTotalMinor = debtRows.reduce((acc, row) => acc + minorOf(row.balance), 0);

  // Fondo de emergencia.
  const targetMonths = Number(profile.emergencyFundTargetMonths ?? 6) || 6;
  const fundRows = await db
    .select({ current: emergencyFunds.currentAmount, target: emergencyFunds.targetAmount })
    .from(emergencyFunds)
    .where(and(eq(emergencyFunds.userId, userId), isNull(emergencyFunds.deletedAt)))
    .orderBy(desc(emergencyFunds.createdAt))
    .limit(1);
  const fundCurrentMinor = minorOf(fundRows[0]?.current);
  const essentialFallback = monthlyExpensesMinor;
  const fundTargetMinor =
    minorOf(fundRows[0]?.target) > 0 ? minorOf(fundRows[0].target) : essentialFallback * targetMonths;

  // Metas activas.
  const goalRows = await db
    .select({ name: goals.name, target: goals.targetAmount, current: goals.currentAmount, targetDate: goals.targetDate })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active"), isNull(goals.deletedAt)))
    .orderBy(goals.priority, goals.createdAt);
  const surplusMinor = monthlyIncomeMinor - monthlyExpensesMinor;
  const goalsInfo: AIGoalInfo[] = goalRows.map((row) => {
    const targetMinor = minorOf(row.target);
    const currentMinor = minorOf(row.current);
    const monthsLeft = row.targetDate ? monthsUntil(String(row.targetDate), now) : null;
    const perMonthNeededMinor =
      monthsLeft && monthsLeft > 0 ? Math.ceil(Math.max(0, targetMinor - currentMinor) / monthsLeft) : null;
    const monthsToReachMinor =
      surplusMinor > 0 && targetMinor > currentMinor ? Math.ceil((targetMinor - currentMinor) / surplusMinor) : null;
    return { name: row.name, targetMinor, currentMinor, monthsLeft, perMonthNeededMinor, monthsToReachMinor };
  });

  // Patrimonio (último snapshot).
  const snapshotRows = await db
    .select({ netWorth: netWorthSnapshots.netWorth })
    .from(netWorthSnapshots)
    .where(and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.currency, currency)))
    .orderBy(desc(netWorthSnapshots.snapshotDate))
    .limit(1);
  const netWorthMinor = minorOf(snapshotRows[0]?.netWorth);

  return {
    currency,
    userName,
    monthLabel,
    monthlyIncomeMinor,
    monthlyExpensesMinor,
    surplusMinor,
    spendByCategory,
    biggestExpense,
    debtsTotalMinor,
    fundCurrentMinor,
    fundTargetMinor,
    goals: goalsInfo,
    netWorthMinor,
    hasActualData,
    hasGoals: goalsInfo.length > 0,
    categoryNames: spendByCategory.map((row) => row.name),
  };
}
