/**
 * Academia (Etapa 19) — lógica compartida server/client, sin base de datos.
 *
 * Aquí viven los enums, las claves de ícono y las funciones puras de
 * progreso. Este módulo nunca importa Drizzle ni `pg`, de modo que puede
 * usarse tanto en Server Components como en componentes de cliente
 * (misma decisión que en el Presupuesto, Etapa 7).
 */

/** Tipos de contenido de la Academia. */
export const ACADEMY_KINDS = ["guide", "article", "lesson", "short", "video"] as const;
export type AcademyKind = (typeof ACADEMY_KINDS)[number];

/** Tipos de contenido que la Etapa 19 publica (video queda para etapas futuras). */
export const ACADEMY_PUBLISHED_KINDS = ["guide", "article", "lesson", "short"] as const;
export type AcademyPublishedKind = (typeof ACADEMY_PUBLISHED_KINDS)[number];

export const ACADEMY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type AcademyLevel = (typeof ACADEMY_LEVELS)[number];

export const ACADEMY_REVIEW_STATUSES = ["pending", "reviewed"] as const;
export type AcademyReviewStatus = (typeof ACADEMY_REVIEW_STATUSES)[number];

export const ACADEMY_PROGRESS_STATUSES = ["pending", "in_progress", "completed"] as const;
export type AcademyProgressStatus = (typeof ACADEMY_PROGRESS_STATUSES)[number];

/** Estados de filtro por avance del usuario. */
export const ACADEMY_FILTER_STATES = [
  "all",
  "favorite",
  "pending",
  "in_progress",
  "completed",
] as const;
export type AcademyFilterState = (typeof ACADEMY_FILTER_STATES)[number];

/** Claves de ícono de categoría (mapeadas a SVG en la UI). */
export const ACADEMY_ICON_KEYS = [
  "wallet",
  "chart",
  "credit-card",
  "target",
  "shield",
  "trending-up",
  "landmark",
  "refresh",
  "book",
] as const;
export type AcademyIconKey = (typeof ACADEMY_ICON_KEYS)[number];

/** Pasos manuales de avance ofrecidos en el lector. */
export const ACADEMY_PROGRESS_STEPS = [25, 50, 75, 100] as const;

export function isAcademyKind(value: unknown): value is AcademyKind {
  return typeof value === "string" && (ACADEMY_KINDS as readonly string[]).includes(value);
}

export function isAcademyPublishedKind(value: unknown): value is AcademyPublishedKind {
  return (
    typeof value === "string" && (ACADEMY_PUBLISHED_KINDS as readonly string[]).includes(value)
  );
}

export function isAcademyLevel(value: unknown): value is AcademyLevel {
  return typeof value === "string" && (ACADEMY_LEVELS as readonly string[]).includes(value);
}

export function isAcademyFilterState(value: unknown): value is AcademyFilterState {
  return (
    typeof value === "string" && (ACADEMY_FILTER_STATES as readonly string[]).includes(value)
  );
}

/** Normaliza un porcentaje de avance al rango 0-100 (entero). */
export function clampProgressPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Estado derivado del avance: 0 = sin empezar, 1-99 = en progreso,
 * 100 = concluido. El estado se **deriva** del porcentaje para que no haya
 * dos fuentes de verdad (el porcentaje manda).
 */
export function statusForPct(pct: number): AcademyProgressStatus {
  const clean = clampProgressPct(pct);
  if (clean <= 0) return "pending";
  return clean >= 100 ? "completed" : "in_progress";
}

export interface AcademyProgressLike {
  progressPct: number;
  isFavorite: boolean;
  status: string;
}

export interface AcademyStats {
  /** Contenidos con avance 100. */
  completed: number;
  /** Contenidos empezados sin terminar. */
  inProgress: number;
  /** Contenidos marcados como favoritos (sin importar avance). */
  favorites: number;
  /** Contenidos publicados sin ningún avance. */
  pending: number;
  /** Total del catálogo considerado. */
  total: number;
  /** Porcentaje de catálogo concluido (0-100, entero). */
  completedPct: number;
}

/**
 * Resumen de progreso a partir de los avances registrados y el tamaño del
 * catálogo. Función pura: mismas entradas, mismo resultado.
 */
export function summarizeProgress(
  progress: AcademyProgressLike[],
  totalContents: number,
): AcademyStats {
  let completed = 0;
  let inProgress = 0;
  let favorites = 0;
  for (const row of progress) {
    const status = statusForPct(row.progressPct);
    if (status === "completed") completed += 1;
    else if (status === "in_progress") inProgress += 1;
    if (row.isFavorite) favorites += 1;
  }
  const total = Math.max(0, totalContents);
  const pending = Math.max(0, total - completed - inProgress);
  const completedPct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, inProgress, favorites, pending, total, completedPct };
}

/** Porcentaje concluido de una categoría (0-100, entero). */
export function categoryProgressPct(completedContents: number, totalContents: number): number {
  if (totalContents <= 0) return 0;
  return Math.round((completedContents / totalContents) * 100);
}
