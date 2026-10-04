/**
 * Estructura del onboarding financiero (Etapa 5).
 * Los textos viven en el diccionario de i18n bajo `onboarding.*`.
 */

import type { CurrencyCode } from "./locales";

export const ONBOARDING_GOALS = [
  "salir_deudas",
  "crear_reserva",
  "ahorrar",
  "comprar_algo",
  "viajar",
  "invertir",
  "patrimonio",
  "otro",
] as const;

export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

export const INCOME_FREQUENCIES = ["monthly", "biweekly", "weekly", "other"] as const;

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

export interface OnboardingCountry {
  /** ISO 3166-1 alpha-2; "OTHER" para países fuera del catálogo inicial. */
  id: string;
  /** Moneda sugerida al elegir el país (null → el usuario la elige). */
  currency: CurrencyCode | null;
}

/** Catálogo inicial de países; ampliar aquí habilita más mercados. */
export const ONBOARDING_COUNTRIES: OnboardingCountry[] = [
  { id: "MX", currency: "MXN" },
  { id: "BR", currency: "BRL" },
  { id: "CO", currency: "COP" },
  { id: "CL", currency: "CLP" },
  { id: "AR", currency: "ARS" },
  { id: "PE", currency: "PEN" },
  { id: "US", currency: "USD" },
  { id: "OTHER", currency: null },
];

export function getDefaultCurrencyForCountry(countryId: string): CurrencyCode | null {
  return ONBOARDING_COUNTRIES.find((entry) => entry.id === countryId)?.currency ?? null;
}

export function isOnboardingGoal(value: string): value is OnboardingGoal {
  return (ONBOARDING_GOALS as readonly string[]).includes(value);
}

export function isIncomeFrequency(value: string): value is IncomeFrequency {
  return (INCOME_FREQUENCIES as readonly string[]).includes(value);
}

export function isOnboardingCountry(value: string): boolean {
  return ONBOARDING_COUNTRIES.some((entry) => entry.id === value);
}
