/**
 * Constantes y tipos de recurrencia compartidos entre servidor y cliente.
 * Este archivo NO importa drizzle/db.
 */

export const RECURRING_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "yearly",
] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

export const UI_FREQUENCIES: RecurringFrequency[] = ["monthly", "biweekly", "weekly"];

export function isRecurringFrequency(value: string): value is RecurringFrequency {
  return (RECURRING_FREQUENCIES as readonly string[]).includes(value);
}

export const HORIZON_MONTHS = 3;
