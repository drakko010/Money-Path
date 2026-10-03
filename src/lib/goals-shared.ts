/**
 * Metas (Etapa 12) — categorías y cálculos puros compartidos
 * servidor/cliente. Sin dependencias de DB.
 */

export const GOAL_CATEGORIES = [
  "viaje",
  "auto",
  "casa",
  "fondo_emergencia",
  "educacion",
  "inversion",
  "compra_personal",
  "otro",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export function isGoalCategory(value: string): value is GoalCategory {
  return (GOAL_CATEGORIES as readonly string[]).includes(value);
}

/** Meses (redondeo hacia arriba) entre hoy y una fecha objetivo. */
export function monthsUntil(targetIso: string | null, now = new Date()): number | null {
  if (!targetIso) return null;
  const target = new Date(`${targetIso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffMs = target.getTime() - todayUtc;
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (30.44 * 86400000)));
}

/** Semanas (redondeo hacia arriba) hasta la fecha objetivo. */
export function weeksUntil(targetIso: string | null, now = new Date()): number | null {
  if (!targetIso) return null;
  const target = new Date(`${targetIso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffMs = target.getTime() - todayUtc;
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (7 * 86400000)));
}

export interface GoalPlan {
  /** Cuánto falta aportar (centavos). */
  remainingMinor: number;
  /** Progreso 0–100. */
  percent: number;
  monthsRemaining: number | null;
  /** Ahorro necesario por mes para llegar a tiempo (null si no hay plazo). */
  perMonthMinor: number | null;
  /** Ahorro necesario por semana para llegar a tiempo. */
  perWeekMinor: number | null;
}

export function computeGoalPlan(
  targetMinor: number,
  currentMinor: number,
  targetIso: string | null,
): GoalPlan {
  const remainingMinor = Math.max(0, targetMinor - currentMinor);
  const percent = targetMinor > 0 ? Math.min(100, Math.round((currentMinor / targetMinor) * 100)) : 0;
  const monthsRemaining = monthsUntil(targetIso);
  const weeks = weeksUntil(targetIso);

  return {
    remainingMinor,
    percent,
    monthsRemaining,
    perMonthMinor: monthsRemaining && monthsRemaining > 0 ? Math.ceil(remainingMinor / monthsRemaining) : null,
    perWeekMinor: weeks && weeks > 0 ? Math.ceil(remainingMinor / weeks) : null,
  };
}

export interface GoalForecast {
  /** Meses estimados al ritmo actual (null si no hay ritmo). */
  months: number | null;
  /** Fecha estimada ISO (null si no se puede estimar). */
  estimatedIso: string | null;
}

/**
 * Previsión "al ritmo actual" basada en el ritmo mensual real de aportes.
 * Sin aportes (ritmo 0) no hay previsión posible.
 */
export function forecastAtCurrentPace(
  remainingMinor: number,
  monthlyPaceMinor: number,
  now = new Date(),
): GoalForecast {
  if (remainingMinor <= 0) {
    return { months: 0, estimatedIso: now.toISOString().slice(0, 10) };
  }
  if (monthlyPaceMinor <= 0) return { months: null, estimatedIso: null };
  const months = Math.ceil(remainingMinor / monthlyPaceMinor);
  const est = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, now.getUTCDate()));
  return { months, estimatedIso: est.toISOString().slice(0, 10) };
}
