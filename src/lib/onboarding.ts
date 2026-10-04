/**
 * Persistencia del onboarding financiero (Etapa 5).
 *
 * - Guarda las respuestas en `financial_profiles` (upsert por usuario).
 * - Crea un estado del Money Path™ en `money_path_states`.
 * - Todo se filtra/actualiza por el usuario de la sesión: nunca por un id
 *   que venga del cliente.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { financialProfiles, moneyPathStates } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { DEFAULT_CURRENCY } from "@/config/locales";
import type { IncomeFrequency, OnboardingGoal } from "@/config/onboarding";
import { toMinorUnits, type MinorUnits } from "./money";

/** Convierte centavos a texto decimal exacto (sin aritmética flotante). */
function minorToDecimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const units = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, "0");
  return `${sign}${units}.${cents}`;
}

export interface OnboardingData {
  country: string;
  currency: CurrencyCode;
  monthlyIncome: MinorUnits;
  incomeFrequency: IncomeFrequency;
  essentialExpenses: MinorUnits;
  hasDebts: boolean;
  totalDebts: MinorUnits;
  currentReserve: MinorUnits;
  currentInvestments: MinorUnits;
  approximateNetWorth: MinorUnits;
  primaryGoal: OnboardingGoal;
}

/** Estado inicial para el formulario (valores como texto decimal). */
export interface OnboardingInitial {
  completed: boolean;
  country: string;
  currency: CurrencyCode;
  monthlyIncome: string;
  incomeFrequency: IncomeFrequency;
  essentialExpenses: string;
  hasDebts: boolean | null;
  totalDebts: string;
  currentReserve: string;
  currentInvestments: string;
  approximateNetWorth: string;
  primaryGoal: OnboardingGoal | null;
}

/** Valor decimal guardado en BD → texto para precargar el formulario. */
function storedToDecimalString(
  value: string | number | null | undefined,
  currency: CurrencyCode,
): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    return minorToDecimal(toMinorUnits(typeof value === "number" ? String(value) : value, currency));
  } catch {
    return "";
  }
}

export const DEFAULT_ONBOARDING_INITIAL: OnboardingInitial = {
  completed: false,
  country: "MX",
  currency: DEFAULT_CURRENCY,
  monthlyIncome: "",
  incomeFrequency: "monthly",
  essentialExpenses: "",
  hasDebts: null,
  totalDebts: "",
  currentReserve: "",
  currentInvestments: "",
  approximateNetWorth: "",
  primaryGoal: null,
};

/** Carga las respuestas existentes del usuario (para precargar el wizard). */
export async function getOnboarding(userId: string): Promise<OnboardingInitial> {
  const rows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = rows[0];
  if (!profile || !profile.onboardingCompletedAt) {
    return DEFAULT_ONBOARDING_INITIAL;
  }

  const currency = profile.baseCurrency as CurrencyCode;
  return {
    completed: true,
    country: profile.country,
    currency,
    monthlyIncome: storedToDecimalString(profile.monthlyIncome, currency),
    incomeFrequency: profile.incomeFrequency as IncomeFrequency,
    essentialExpenses: storedToDecimalString(profile.monthlyFixedExpenses, currency),
    hasDebts: profile.hasDebts,
    totalDebts: storedToDecimalString(profile.totalDebts, currency),
    currentReserve: storedToDecimalString(profile.currentReserve, currency),
    currentInvestments: storedToDecimalString(profile.currentInvestments, currency),
    approximateNetWorth: storedToDecimalString(profile.approximateNetWorth, currency),
    primaryGoal: (profile.primaryGoal as OnboardingGoal | null) ?? null,
  };
}

/** ¿El usuario ya completó el onboarding? (para redirigir desde /app). */
export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  const rows = await db
    .select({ completedAt: financialProfiles.onboardingCompletedAt })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  return Boolean(rows[0]?.completedAt);
}

/**
 * Guarda las respuestas y crea un estado del Money Path™.
 * Idempotente: repetir el onboarding actualiza el perfil y agrega un nuevo
 * estado (historial auditable).
 */
export async function saveOnboarding(userId: string, data: OnboardingData): Promise<void> {
  const now = new Date();

  await db
    .insert(financialProfiles)
    .values({
      userId,
      country: data.country,
      baseCurrency: data.currency,
      monthlyIncome: minorToDecimal(data.monthlyIncome),
      monthlyFixedExpenses: minorToDecimal(data.essentialExpenses),
      incomeFrequency: data.incomeFrequency,
      hasDebts: data.hasDebts,
      totalDebts: minorToDecimal(data.totalDebts),
      currentReserve: minorToDecimal(data.currentReserve),
      currentInvestments: minorToDecimal(data.currentInvestments),
      approximateNetWorth: minorToDecimal(data.approximateNetWorth),
      primaryGoal: data.primaryGoal,
      onboardingCompletedAt: now,
    })
    .onConflictDoUpdate({
      target: financialProfiles.userId,
      set: {
        country: data.country,
        baseCurrency: data.currency,
        monthlyIncome: minorToDecimal(data.monthlyIncome),
        monthlyFixedExpenses: minorToDecimal(data.essentialExpenses),
        incomeFrequency: data.incomeFrequency,
        hasDebts: data.hasDebts,
        totalDebts: minorToDecimal(data.totalDebts),
        currentReserve: minorToDecimal(data.currentReserve),
        currentInvestments: minorToDecimal(data.currentInvestments),
        approximateNetWorth: minorToDecimal(data.approximateNetWorth),
        primaryGoal: data.primaryGoal,
        onboardingCompletedAt: now,
      },
    });

  // Primer estado del Money Path™ (montos en centavos, sin punto flotante).
  await db.insert(moneyPathStates).values({
    userId,
    source: "onboarding",
    state: {
      currency: data.currency,
      country: data.country,
      monthlyIncomeMinor: data.monthlyIncome,
      essentialExpensesMinor: data.essentialExpenses,
      monthlyBalanceMinor: data.monthlyIncome - data.essentialExpenses,
      hasDebts: data.hasDebts,
      totalDebtsMinor: data.totalDebts,
      currentReserveMinor: data.currentReserve,
      currentInvestmentsMinor: data.currentInvestments,
      approximateNetWorthMinor: data.approximateNetWorth,
      incomeFrequency: data.incomeFrequency,
      primaryGoal: data.primaryGoal,
    },
  });
}
