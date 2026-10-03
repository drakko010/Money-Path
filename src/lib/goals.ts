/**
 * Metas (Etapa 12) — SOLO SERVIDOR.
 * Las contribuciones actualizan `goals.current_amount` automáticamente.
 */

import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { financialProfiles, goalContributions, goals } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { MinorUnits } from "./money";
import {
  computeGoalPlan,
  forecastAtCurrentPace,
  type GoalCategory,
  type GoalForecast,
  type GoalPlan,
} from "./goals-shared";

export function minorOf(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export interface GoalView extends GoalPlan {
  id: string;
  name: string;
  description: string | null;
  category: GoalCategory;
  targetMinor: MinorUnits;
  currentMinor: MinorUnits;
  targetDate: string | null;
  priority: number;
  status: string;
  /** Ritmo mensual real de aportes (centavos). */
  monthlyPaceMinor: MinorUnits;
  forecast: GoalForecast;
  contributionsCount: number;
}

export interface GoalsData {
  currency: CurrencyCode;
  goals: GoalView[];
  summary: {
    totalTargetMinor: MinorUnits;
    totalCurrentMinor: MinorUnits;
    activeCount: number;
    achievedCount: number;
  };
}

export async function getGoalsData(userId: string): Promise<GoalsData | null> {
  const profileRows = await db
    .select({
      baseCurrency: financialProfiles.baseCurrency,
      onboardingCompletedAt: financialProfiles.onboardingCompletedAt,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;
  const currency = profile.baseCurrency as CurrencyCode;

  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.currency, currency), isNull(goals.deletedAt)))
    .orderBy(goals.priority, desc(goals.createdAt));

  const goalIds = rows.map((row) => row.id);
  const contributions =
    goalIds.length > 0
      ? await db
          .select({
            goalId: goalContributions.goalId,
            amount: goalContributions.amount,
            contributedOn: goalContributions.contributedOn,
          })
          .from(goalContributions)
          .where(
            and(
              eq(goalContributions.userId, userId),
              isNull(goalContributions.deletedAt),
              sql`${goalContributions.goalId} IN (${sql.join(
                goalIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
      : [];

  const now = new Date();
  const contributionsByGoal = new Map<string, { amount: MinorUnits; date: string }[]>();
  for (const contribution of contributions) {
    const list = contributionsByGoal.get(contribution.goalId) ?? [];
    list.push({ amount: minorOf(contribution.amount), date: String(contribution.contributedOn) });
    contributionsByGoal.set(contribution.goalId, list);
  }

  const views: GoalView[] = rows.map((row) => {
    const targetMinor = minorOf(row.targetAmount);
    const currentMinor = minorOf(row.currentAmount);
    const targetDate = row.targetDate ? String(row.targetDate) : null;
    const plan = computeGoalPlan(targetMinor, currentMinor, targetDate);

    // Ritmo actual: aportes totales de la meta ÷ meses desde el primer aporte.
    const goalContributions = contributionsByGoal.get(row.id) ?? [];
    let monthlyPaceMinor = 0;
    if (goalContributions.length > 0) {
      const total = goalContributions.reduce((acc, contribution) => acc + contribution.amount, 0);
      const firstDate = goalContributions
        .map((contribution) => contribution.date)
        .sort()[0];
      const first = new Date(`${firstDate}T00:00:00Z`);
      const monthsSince = Math.max(
        1,
        (now.getUTCFullYear() - first.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - first.getUTCMonth()) +
          1,
      );
      monthlyPaceMinor = Math.ceil(total / monthsSince);
    }
    const forecast = forecastAtCurrentPace(plan.remainingMinor, monthlyPaceMinor, now);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as GoalCategory,
      targetMinor,
      currentMinor,
      targetDate,
      priority: row.priority ?? 2,
      status: row.status,
      ...plan,
      monthlyPaceMinor,
      forecast,
      contributionsCount: goalContributions.length,
    };
  });

  const active = views.filter((view) => view.status === "active");
  const achieved = views.filter((view) => view.status === "achieved");

  return {
    currency,
    goals: views,
    summary: {
      totalTargetMinor: active.reduce((acc, view) => acc + view.targetMinor, 0),
      totalCurrentMinor: active.reduce((acc, view) => acc + view.currentMinor, 0),
      activeCount: active.length,
      achievedCount: achieved.length,
    },
  };
}

/** Registra un aporte y actualiza el progreso de la meta. */
export async function registerContribution(
  userId: string,
  goalId: string,
  amountMinor: MinorUnits,
  currency: CurrencyCode,
  note: string | null,
): Promise<{ ok: boolean; newCurrent?: MinorUnits }> {
  const goalRows = await db
    .select({ id: goals.id, currentAmount: goals.currentAmount, targetAmount: goals.targetAmount })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId), isNull(goals.deletedAt)))
    .limit(1);
  const goal = goalRows[0];
  if (!goal) return { ok: false };

  await db.insert(goalContributions).values({
    userId,
    goalId,
    amount: decimal(amountMinor),
    currency,
    contributedOn: new Date().toISOString().slice(0, 10),
    note,
  });

  const newCurrent = minorOf(goal.currentAmount) + amountMinor;
  const target = minorOf(goal.targetAmount);
  await db
    .update(goals)
    .set({
      currentAmount: decimal(newCurrent),
      status: target > 0 && newCurrent >= target ? "achieved" : "active",
    })
    .where(eq(goals.id, goalId));

  return { ok: true, newCurrent };
}
