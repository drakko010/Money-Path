/**
 * Fondo de Emergencia (Etapa 11) — SOLO SERVIDOR.
 *
 * Gasto esencial mensual: si el usuario definió un ajuste manual se usa ese;
 * en caso contrario se calcula como el promedio de los últimos 3 meses de
 * gastos registrados en las categorías marcadas como esenciales. Las
 * categorías discrecionales NO cuentan (no se marcan esenciales por defecto).
 */

import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  emergencyFunds,
  expenseCategories,
  expenses,
  financialProfiles,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { MinorUnits } from "./money";

/** Ventana usada para promediar el gasto esencial. */
export const ESSENTIAL_WINDOW_MONTHS = 3;

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

export interface EssentialCategoryBreakdown {
  categoryId: string;
  name: string;
  /** Promedio mensual de los últimos meses (centavos). */
  monthlyMinor: MinorUnits;
  /** Total registrado en la ventana (centavos). */
  windowTotalMinor: MinorUnits;
}

export interface EssentialMonthlyResult {
  /** Gasto esencial mensual a usar (centavos). */
  minor: MinorUnits;
  /** Origen del valor: ajuste manual o cálculo por categorías. */
  source: "override" | "calculated";
  overrideMinor: MinorUnits | null;
  breakdown: EssentialCategoryBreakdown[];
}

/** Início de la ventana de `months` meses terminando en el mes actual. */
function windowStartIso(months: number, now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m - (months - 1), 1));
  return start.toISOString().slice(0, 10);
}

/**
 * Calcula el gasto esencial mensual del usuario y el desglose por categoría.
 */
export async function computeEssentialMonthly(
  userId: string,
  currency: CurrencyCode,
): Promise<EssentialMonthlyResult> {
  const profileRows = await db
    .select({
      essentialMonthlyOverride: financialProfiles.essentialMonthlyOverride,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const overrideMinor = minorOf(profileRows[0]?.essentialMonthlyOverride ?? null);

  // Categorías esenciales activas del usuario.
  const essentialCategories = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.userId, userId),
        eq(expenseCategories.isEssential, true),
        eq(expenseCategories.status, "active"),
        isNull(expenseCategories.deletedAt),
      ),
    );

  const from = windowStartIso(ESSENTIAL_WINDOW_MONTHS);

  let breakdown: EssentialCategoryBreakdown[] = [];
  if (essentialCategories.length > 0) {
    const categoryIds = essentialCategories.map((category) => category.id);
    const sums = await db
      .select({
        categoryId: expenses.categoryId,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          eq(expenses.currency, currency),
          isNull(expenses.deletedAt),
          sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
          gte(expenses.occurredOn, from),
          sql`${expenses.categoryId} IN (${sql.join(
            categoryIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      )
      .groupBy(expenses.categoryId);

    const byCategory = new Map(
      sums.map((row) => [row.categoryId, minorOf(row.total)] as const),
    );

    breakdown = essentialCategories
      .map((category) => {
        const windowTotal = byCategory.get(category.id) ?? 0;
        return {
          categoryId: category.id,
          name: category.name,
          windowTotalMinor: windowTotal,
          monthlyMinor: Math.round(windowTotal / ESSENTIAL_WINDOW_MONTHS),
        };
      })
      .sort((a, b) => b.monthlyMinor - a.monthlyMinor);
  }

  const calculated = breakdown.reduce((acc, row) => acc + row.monthlyMinor, 0);

  // El ajuste manual tiene prioridad; si no, se usa lo calculado.
  if (overrideMinor > 0) {
    return { minor: overrideMinor, source: "override", overrideMinor, breakdown };
  }
  return { minor: calculated, source: "calculated", overrideMinor: null, breakdown };
}

/** Meses objetivo del fondo (3/6/9/12 u otro elegido por el usuario). */
export async function getTargetMonths(userId: string): Promise<number> {
  const rows = await db
    .select({ months: financialProfiles.emergencyFundTargetMonths })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const value = Number(rows[0]?.months ?? 6);
  return Number.isFinite(value) && value > 0 ? value : 6;
}

/**
 * Garantiza que exista un fondo para el usuario; si no, lo crea sembrado
 * con la reserva declarada en el onboarding.
 */
export async function getOrCreateFund(
  userId: string,
  currency: CurrencyCode,
): Promise<{ id: string; currentMinor: MinorUnits }> {
  const existing = await db
    .select({ id: emergencyFunds.id, current: emergencyFunds.currentAmount })
    .from(emergencyFunds)
    .where(
      and(
        eq(emergencyFunds.userId, userId),
        eq(emergencyFunds.currency, currency),
        isNull(emergencyFunds.deletedAt),
      ),
    )
    .orderBy(emergencyFunds.createdAt)
    .limit(1);

  if (existing.length > 0) {
    return { id: existing[0].id, currentMinor: minorOf(existing[0].current) };
  }

  const profileRows = await db
    .select({ currentReserve: financialProfiles.currentReserve })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const seed = minorOf(profileRows[0]?.currentReserve ?? 0);

  const created = await db
    .insert(emergencyFunds)
    .values({
      userId,
      name: "Fondo de emergencia",
      currency,
      currentAmount: decimal(seed),
      targetAmount: decimal(Math.max(1, seed)),
      targetMonths: "6",
      status: "building",
    })
    .returning({ id: emergencyFunds.id });

  return { id: created[0]?.id ?? "", currentMinor: seed };
}

/** Mantiene el objetivo del fondo sincronizado en `emergency_funds`. */
export async function syncFundTarget(
  fundId: string,
  targetMinor: MinorUnits,
  targetMonths: number,
  currentMinor: MinorUnits,
): Promise<void> {
  await db
    .update(emergencyFunds)
    .set({
      targetAmount: decimal(Math.max(0, targetMinor)),
      targetMonths: String(targetMonths),
      status: targetMinor > 0 && currentMinor >= targetMinor ? "complete" : "building",
    })
    .where(eq(emergencyFunds.id, fundId));
}

/** Vista completa del módulo para la página. */
export interface FondoData {
  currency: CurrencyCode;
  essentialMonthlyMinor: MinorUnits;
  essentialSource: "override" | "calculated";
  overrideMinor: MinorUnits | null;
  breakdown: EssentialCategoryBreakdown[];
  windowMonths: number;
  targetMonths: number;
  targetMinor: MinorUnits;
  currentMinor: MinorUnits;
  remainingMinor: MinorUnits;
  percent: number;
  monthsProtected: number;
  /** Todas las categorías de gasto activas (para marcar esenciales). */
  categories: Array<{
    id: string;
    name: string;
    kind: "fixed" | "variable";
    isEssential: boolean;
    monthlyMinor: MinorUnits;
  }>;
}

export async function getFondoData(userId: string): Promise<FondoData | null> {
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

  const essential = await computeEssentialMonthly(userId, currency);
  const targetMonths = await getTargetMonths(userId);
  const fund = await getOrCreateFund(userId, currency);

  const targetMinor = essential.minor * targetMonths;
  // Mantiene el objetivo persistido para que el dashboard quede en sintonía.
  await syncFundTarget(fund.id, targetMinor, targetMonths, fund.currentMinor);

  const remainingMinor = Math.max(0, targetMinor - fund.currentMinor);
  const percent = targetMinor > 0 ? Math.min(100, Math.round((fund.currentMinor / targetMinor) * 100)) : 0;
  const monthsProtected = essential.minor > 0 ? fund.currentMinor / essential.minor : 0;

  // Categorías activas con su promedio mensual (para el selector de esenciales).
  const allCategories = await db
    .select({
      id: expenseCategories.id,
      name: expenseCategories.name,
      kind: expenseCategories.kind,
      isEssential: expenseCategories.isEssential,
    })
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.userId, userId),
        eq(expenseCategories.status, "active"),
        isNull(expenseCategories.deletedAt),
      ),
    )
    .orderBy(expenseCategories.sortOrder, expenseCategories.name);

  const from = windowStartIso(ESSENTIAL_WINDOW_MONTHS);
  const expenseSums = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.currency, currency),
        isNull(expenses.deletedAt),
        sql`(${expenses.status} = 'paid' OR ${expenses.status} = 'pending')`,
        gte(expenses.occurredOn, from),
      ),
    )
    .groupBy(expenses.categoryId);
  const sumByCategory = new Map(
    expenseSums.map((row) => [row.categoryId, minorOf(row.total)] as const),
  );

  const categories = allCategories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind as "fixed" | "variable",
    isEssential: category.isEssential,
    monthlyMinor: Math.round((sumByCategory.get(category.id) ?? 0) / ESSENTIAL_WINDOW_MONTHS),
  }));

  return {
    currency,
    essentialMonthlyMinor: essential.minor,
    essentialSource: essential.source,
    overrideMinor: essential.overrideMinor,
    breakdown: essential.breakdown,
    windowMonths: ESSENTIAL_WINDOW_MONTHS,
    targetMonths,
    targetMinor,
    currentMinor: fund.currentMinor,
    remainingMinor,
    percent,
    monthsProtected,
    categories,
  };
}
