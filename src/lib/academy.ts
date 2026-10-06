/**
 * Academia (Etapa 19) — SOLO SERVIDOR.
 *
 * Lee el catálogo educativo (`academy_categories` / `academy_contents`) y el
 * progreso del usuario (`academy_progress`). El catálogo base de
 * `src/config/academy.ts` se siembra de forma **idempotente por slug** con
 * `ensureAcademySeed()` (mismo patrón bajo demanda que las recurrencias,
 * Etapa 8): la base de datos es siempre la fuente de verdad de lo que la UI
 * muestra.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { academyCategories, academyContents, academyProgress } from "@/db/schema";
import { ACADEMY_CATEGORIES, ACADEMY_CONTENTS } from "@/config/academy";
import {
  ACADEMY_PUBLISHED_KINDS,
  categoryProgressPct,
  clampProgressPct,
  isAcademyFilterState,
  isAcademyLevel,
  isAcademyPublishedKind,
  statusForPct,
  summarizeProgress,
  type AcademyFilterState,
  type AcademyIconKey,
  type AcademyKind,
  type AcademyLevel,
  type AcademyProgressStatus,
  type AcademyReviewStatus,
  type AcademyStats,
} from "./academy-shared";

/* ── Siembra idempotente del catálogo base ───────────────────────────── */

export interface AcademySeedResult {
  ok: boolean;
  categories: number;
  contents: number;
}

/**
 * Asegura que el catálogo base exista en la base de datos.
 *
 * Idempotente por `slug`: solo inserta lo que falta (`onConflictDoNothing`),
 * de modo que cualquier ajuste editorial hecho directamente en la base de
 * datos nunca se sobrescribe. Si las tablas aún no existen, devuelve
 * `ok: false` para que la UI muestre un estado vacío en lugar de romperse.
 */
export async function ensureAcademySeed(): Promise<AcademySeedResult> {
  try {
    const existingCategories = await db
      .select({ slug: academyCategories.slug })
      .from(academyCategories);
    const knownCategories = new Set(existingCategories.map((row) => row.slug));
    const missingCategories = ACADEMY_CATEGORIES.filter(
      (category) => !knownCategories.has(category.slug),
    );

    if (missingCategories.length > 0) {
      await db
        .insert(academyCategories)
        .values(
          missingCategories.map((category) => ({
            slug: category.slug,
            name: category.name,
            description: category.description,
            icon: category.icon,
            sortOrder: category.sortOrder,
            isActive: true,
          })),
        )
        .onConflictDoNothing({ target: academyCategories.slug });
    }

    const categoryRows = await db
      .select({ id: academyCategories.id, slug: academyCategories.slug })
      .from(academyCategories);
    const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id] as const));

    const existingContents = await db
      .select({ slug: academyContents.slug })
      .from(academyContents);
    const knownContents = new Set(existingContents.map((row) => row.slug));

    const missingContents = ACADEMY_CONTENTS.filter(
      (content) =>
        !knownContents.has(content.slug) && categoryIdBySlug.has(content.categorySlug),
    );

    if (missingContents.length > 0) {
      await db
        .insert(academyContents)
        .values(
          missingContents.map((content) => ({
            categoryId: categoryIdBySlug.get(content.categorySlug) as string,
            slug: content.slug,
            title: content.title,
            kind: content.kind,
            summary: content.summary,
            body: content.body,
            durationMinutes: content.durationMinutes,
            level: content.level,
            reviewStatus: content.reviewStatus,
            sources: content.sources,
            sortOrder: content.sortOrder,
            isFeatured: content.isFeatured ?? false,
            isPublished: true,
            publishedAt: new Date(),
          })),
        )
        .onConflictDoNothing({ target: academyContents.slug });
    }

    return {
      ok: true,
      categories: categoryRows.length,
      contents: knownContents.size + missingContents.length,
    };
  } catch {
    // El catálogo no está listo (migración pendiente): la UI muestra estado vacío.
    return { ok: false, categories: 0, contents: 0 };
  }
}

/* ── Tipos de vista ──────────────────────────────────────────────────── */

export interface AcademyContentCard {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: AcademyKind;
  level: AcademyLevel;
  durationMinutes: number | null;
  reviewStatus: AcademyReviewStatus;
  isFeatured: boolean;
  categorySlug: string;
  categoryName: string;
  categoryIcon: AcademyIconKey | string;
  /** Avance del usuario (0-100). */
  progressPct: number;
  isFavorite: boolean;
  status: AcademyProgressStatus;
  lastViewedAt: string | null;
  completedAt: string | null;
}

export interface AcademyCategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: AcademyIconKey | string;
  totalContents: number;
  completedContents: number;
  inProgressContents: number;
  favoritesContents: number;
  progressPct: number;
}

export interface AcademyFilters {
  kind: AcademyKind | "all";
  level: AcademyLevel | "all";
  state: AcademyFilterState;
  category: string;
  query: string;
}

export interface AcademyHomeData {
  ready: boolean;
  stats: AcademyStats;
  /** Contenido empezado y sin terminar más reciente (o el sugerido para empezar). */
  continueContent: AcademyContentCard | null;
  featured: AcademyContentCard[];
  categories: AcademyCategoryView[];
  /** Catálogo completo (sin filtros) para contadores y filtros disponibles. */
  catalog: AcademyContentCard[];
  /** Catálogo filtrado por los criterios activos. */
  results: AcademyContentCard[];
  filters: AcademyFilters;
  availableKinds: AcademyKind[];
  availableLevels: AcademyLevel[];
}

export interface AcademyCategoryData {
  ready: boolean;
  category: AcademyCategoryView;
  contents: AcademyContentCard[];
  filters: AcademyFilters;
  availableKinds: AcademyKind[];
  availableLevels: AcademyLevel[];
}

export interface AcademyContentDetail {
  ready: boolean;
  content: AcademyContentCard & { body: string | null; sources: string | null };
  category: { slug: string; name: string; description: string | null; icon: string };
  siblings: AcademyContentCard[];
  previous: AcademyContentCard | null;
  next: AcademyContentCard | null;
}

export interface AcademyProgressData {
  ready: boolean;
  stats: AcademyStats;
  completed: AcademyContentCard[];
  inProgress: AcademyContentCard[];
  favorites: AcademyContentCard[];
  pending: AcademyContentCard[];
  categories: AcademyCategoryView[];
}

/* ── Consultas ───────────────────────────────────────────────────────── */

type RawRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  kind: string;
  level: string;
  durationMinutes: number | null;
  reviewStatus: string;
  isFeatured: boolean;
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  categoryDescription: string | null;
  progressPct: number | null;
  isFavorite: boolean | null;
  lastViewedAt: Date | null;
  completedAt: Date | null;
};

function toCard(row: RawRow): AcademyContentCard {
  const progressPct = clampProgressPct(row.progressPct ?? 0);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    kind: row.kind as AcademyKind,
    level: row.level as AcademyLevel,
    durationMinutes: row.durationMinutes,
    reviewStatus: row.reviewStatus as AcademyReviewStatus,
    isFeatured: row.isFeatured,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    progressPct,
    isFavorite: row.isFavorite ?? false,
    status: statusForPct(progressPct),
    lastViewedAt: row.lastViewedAt ? row.lastViewedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

/**
 * Catálogo publicado con el progreso del usuario (left join por progreso).
 * El tamaño del catálogo es pequeño (decenas de piezas), por lo que los
 * filtros de la UI se aplican en memoria sobre este resultado.
 */
async function fetchCatalog(userId: string) {
  const rows = await db
    .select({
      id: academyContents.id,
      slug: academyContents.slug,
      title: academyContents.title,
      summary: academyContents.summary,
      kind: academyContents.kind,
      level: academyContents.level,
      durationMinutes: academyContents.durationMinutes,
      reviewStatus: academyContents.reviewStatus,
      isFeatured: academyContents.isFeatured,
      categorySlug: academyCategories.slug,
      categoryName: academyCategories.name,
      categoryIcon: academyCategories.icon,
      categoryDescription: academyCategories.description,
      progressPct: academyProgress.progressPct,
      isFavorite: academyProgress.isFavorite,
      lastViewedAt: academyProgress.lastViewedAt,
      completedAt: academyProgress.completedAt,
    })
    .from(academyContents)
    .innerJoin(academyCategories, eq(academyContents.categoryId, academyCategories.id))
    .leftJoin(
      academyProgress,
      and(
        eq(academyProgress.contentId, academyContents.id),
        eq(academyProgress.userId, userId),
      ),
    )
    .where(
      and(
        eq(academyContents.isPublished, true),
        eq(academyCategories.isActive, true),
      ),
    )
    .orderBy(
      asc(academyCategories.sortOrder),
      asc(academyContents.sortOrder),
      asc(academyContents.title),
    );

  const cards = rows.map((row) => toCard(row as RawRow));

  // Categorías presentes en el catálogo, en su orden editorial.
  const categoryRows = await db
    .select({
      id: academyCategories.id,
      slug: academyCategories.slug,
      name: academyCategories.name,
      description: academyCategories.description,
      icon: academyCategories.icon,
    })
    .from(academyCategories)
    .where(eq(academyCategories.isActive, true))
    .orderBy(asc(academyCategories.sortOrder), asc(academyCategories.name));

  return { cards, categoryRows };
}

function buildCategoryViews(
  categoryRows: { id: string; slug: string; name: string; description: string | null; icon: string }[],
  cards: AcademyContentCard[],
): AcademyCategoryView[] {
  return categoryRows.map((category) => {
    const items = cards.filter((card) => card.categorySlug === category.slug);
    const completedContents = items.filter((item) => item.status === "completed").length;
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
      totalContents: items.length,
      completedContents,
      inProgressContents: items.filter((item) => item.status === "in_progress").length,
      favoritesContents: items.filter((item) => item.isFavorite).length,
      progressPct: categoryProgressPct(completedContents, items.length),
    };
  });
}

/* ── Filtros (query string) ──────────────────────────────────────────── */

export interface AcademySearchParams {
  tipo?: string;
  nivel?: string;
  estado?: string;
  cat?: string;
  q?: string;
}

export function parseAcademyFilters(params: AcademySearchParams): AcademyFilters {
  return {
    kind: isAcademyPublishedKind(params.tipo) ? params.tipo : "all",
    level: isAcademyLevel(params.nivel) ? params.nivel : "all",
    state: isAcademyFilterState(params.estado) ? params.estado : "all",
    category: typeof params.cat === "string" && params.cat.length > 0 ? params.cat : "all",
    query: typeof params.q === "string" ? params.q.trim().slice(0, 80) : "",
  };
}

export function filterAcademyContents(
  cards: AcademyContentCard[],
  filters: AcademyFilters,
): AcademyContentCard[] {
  const query = filters.query.toLocaleLowerCase("es-MX");
  return cards.filter((card) => {
    if (filters.kind !== "all" && card.kind !== filters.kind) return false;
    if (filters.level !== "all" && card.level !== filters.level) return false;
    if (filters.category !== "all" && card.categorySlug !== filters.category) return false;
    if (filters.state === "completed" && card.status !== "completed") return false;
    if (filters.state === "in_progress" && card.status !== "in_progress") return false;
    if (filters.state === "pending" && card.status !== "pending") return false;
    if (filters.state === "favorite" && !card.isFavorite) return false;
    if (query.length > 0) {
      const haystack = `${card.title} ${card.summary ?? ""} ${card.categoryName}`.toLocaleLowerCase(
        "es-MX",
      );
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Tipos y niveles realmente presentes en el catálogo (filtros honestos). */
function availableFacets(cards: AcademyContentCard[]) {
  const kinds = ACADEMY_PUBLISHED_KINDS.filter((kind) =>
    cards.some((card) => card.kind === kind),
  );
  const levels = (["beginner", "intermediate", "advanced"] as const).filter((level) =>
    cards.some((card) => card.level === level),
  );
  return { kinds: [...kinds] as AcademyKind[], levels: [...levels] as AcademyLevel[] };
}

/* ── Datos de las páginas ────────────────────────────────────────────── */

/** Inicio de la Academia: progreso, categorías, destacados y catálogo. */
export async function getAcademyHomeData(
  userId: string,
  params: AcademySearchParams = {},
): Promise<AcademyHomeData> {
  const seed = await ensureAcademySeed();
  const filters = parseAcademyFilters(params);
  const { cards, categoryRows } = await fetchCatalog(userId);
  const stats = summarizeProgress(cards, cards.length);
  const facets = availableFacets(cards);

  const started = cards
    .filter((card) => card.status === "in_progress")
    .sort((a, b) => (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? ""));
  const firstPending = cards.find((card) => card.status === "pending") ?? null;

  return {
    ready: seed.ok && cards.length > 0,
    stats,
    continueContent: started[0] ?? firstPending,
    featured: cards.filter((card) => card.isFeatured).slice(0, 4),
    categories: buildCategoryViews(categoryRows, cards),
    catalog: cards,
    results: filterAcademyContents(cards, filters),
    filters,
    availableKinds: facets.kinds,
    availableLevels: facets.levels,
  };
}

/** Categoría con sus contenidos y filtros. */
export async function getAcademyCategoryData(
  userId: string,
  categorySlug: string,
  params: AcademySearchParams = {},
): Promise<AcademyCategoryData | null> {
  const seed = await ensureAcademySeed();
  if (!seed.ok) return null;

  const { cards, categoryRows } = await fetchCatalog(userId);
  const views = buildCategoryViews(categoryRows, cards);
  const category = views.find((view) => view.slug === categorySlug);
  if (!category) return null;

  const filters = parseAcademyFilters(params);
  const inCategory = cards.filter((card) => card.categorySlug === categorySlug);
  const facets = availableFacets(inCategory);

  return {
    ready: true,
    category,
    contents: filterAcademyContents(inCategory, { ...filters, category: "all" }),
    filters,
    availableKinds: facets.kinds,
    availableLevels: facets.levels,
  };
}

/** Detalle de un contenido publicado + navegación dentro de su categoría. */
export async function getAcademyContentDetail(
  userId: string,
  contentSlug: string,
): Promise<AcademyContentDetail | null> {
  const seed = await ensureAcademySeed();
  if (!seed.ok) return null;

  const rows = await db
    .select({
      body: academyContents.body,
      sources: academyContents.sources,
      categoryDescription: academyCategories.description,
    })
    .from(academyContents)
    .innerJoin(academyCategories, eq(academyContents.categoryId, academyCategories.id))
    .where(and(eq(academyContents.slug, contentSlug), eq(academyContents.isPublished, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const { cards } = await fetchCatalog(userId);
  const content = cards.find((card) => card.slug === contentSlug);
  if (!content) return null;

  const siblings = cards.filter((card) => card.categorySlug === content.categorySlug);
  const index = siblings.findIndex((card) => card.slug === contentSlug);

  return {
    ready: true,
    content: { ...content, body: row.body, sources: row.sources },
    category: {
      slug: content.categorySlug,
      name: content.categoryName,
      description: row.categoryDescription,
      icon: content.categoryIcon,
    },
    siblings,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

/** Mi progreso: concluidos, en progreso, favoritos y pendientes. */
export async function getAcademyProgressData(userId: string): Promise<AcademyProgressData> {
  const seed = await ensureAcademySeed();
  const { cards, categoryRows } = await fetchCatalog(userId);
  const stats = summarizeProgress(cards, cards.length);

  return {
    ready: seed.ok && cards.length > 0,
    stats,
    completed: cards.filter((card) => card.status === "completed"),
    inProgress: cards
      .filter((card) => card.status === "in_progress")
      .sort((a, b) => (b.lastViewedAt ?? "").localeCompare(a.lastViewedAt ?? "")),
    favorites: cards.filter((card) => card.isFavorite),
    pending: cards.filter((card) => card.status === "pending"),
    categories: buildCategoryViews(categoryRows, cards).filter(
      (category) => category.totalContents > 0,
    ),
  };
}

/* ── Escritura de progreso (API) ─────────────────────────────────────── */

export type AcademyProgressOp = "open" | "setProgress" | "complete" | "reset" | "toggleFavorite";

async function findPublishedContentId(slug: string): Promise<string | null> {
  const rows = await db
    .select({ id: academyContents.id })
    .from(academyContents)
    .where(and(eq(academyContents.slug, slug), eq(academyContents.isPublished, true)))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function readOwnProgress(userId: string, contentId: string) {
  const rows = await db
    .select({
      progressPct: academyProgress.progressPct,
      isFavorite: academyProgress.isFavorite,
      status: academyProgress.status,
      startedAt: academyProgress.startedAt,
    })
    .from(academyProgress)
    .where(
      and(eq(academyProgress.userId, userId), eq(academyProgress.contentId, contentId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface AcademyProgressResult {
  ok: boolean;
  error?: "not_found" | "invalid";
  progressPct: number;
  isFavorite: boolean;
  status: AcademyProgressStatus;
}

/**
 * Aplica una operación de progreso del usuario sobre un contenido publicado.
 * El `user_id` siempre viene de la sesión (nunca del cliente) y el progreso
 * se guarda en una única fila por usuario+contenido (upsert).
 */
export async function applyAcademyProgress(
  userId: string,
  slug: string,
  op: AcademyProgressOp,
  pctInput?: number,
): Promise<AcademyProgressResult> {
  await ensureAcademySeed();
  const contentId = await findPublishedContentId(slug);
  if (!contentId) {
    return { ok: false, error: "not_found", progressPct: 0, isFavorite: false, status: "pending" };
  }

  const current = await readOwnProgress(userId, contentId);
  const currentPct = clampProgressPct(current?.progressPct ?? 0);
  const currentFavorite = current?.isFavorite ?? false;

  let nextPct = currentPct;
  let nextFavorite = currentFavorite;

  switch (op) {
    case "open":
      // Registrar visita sin alterar el avance (0% sigue siendo "sin empezar"
      // hasta que el usuario decida avanzar o concluir).
      break;
    case "setProgress": {
      if (typeof pctInput !== "number" || !Number.isFinite(pctInput)) {
        return {
          ok: false,
          error: "invalid",
          progressPct: currentPct,
          isFavorite: currentFavorite,
          status: statusForPct(currentPct),
        };
      }
      nextPct = clampProgressPct(pctInput);
      break;
    }
    case "complete":
      nextPct = 100;
      break;
    case "reset":
      nextPct = 0;
      break;
    case "toggleFavorite":
      nextFavorite = !currentFavorite;
      break;
  }

  const status = statusForPct(nextPct);
  const now = new Date();

  await db
    .insert(academyProgress)
    .values({
      userId,
      contentId,
      status,
      progressPct: nextPct,
      isFavorite: nextFavorite,
      startedAt: now,
      completedAt: status === "completed" ? now : null,
      lastViewedAt: now,
    })
    .onConflictDoUpdate({
      target: [academyProgress.userId, academyProgress.contentId],
      set: {
        status,
        progressPct: nextPct,
        isFavorite: nextFavorite,
        lastViewedAt: now,
        completedAt: status === "completed" ? now : null,
        updatedAt: now,
      },
    });

  return { ok: true, progressPct: nextPct, isFavorite: nextFavorite, status };
}

/** Contadores del catálogo (para el estado de la siembra y diagnósticos). */
export async function countAcademyCatalog() {
  const rows = await db
    .select({
      categories: sql<number>`count(distinct ${academyContents.categoryId})`,
      contents: sql<number>`count(*)`,
    })
    .from(academyContents)
    .where(eq(academyContents.isPublished, true));
  return {
    categories: Number(rows[0]?.categories ?? 0),
    contents: Number(rows[0]?.contents ?? 0),
  };
}
