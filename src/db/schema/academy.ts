import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  ACADEMY_KINDS,
  ACADEMY_LEVELS,
  ACADEMY_PROGRESS_STATUSES,
  ACADEMY_REVIEW_STATUSES,
} from "../../lib/academy-shared";
import { id, timestamps } from "./common";
import { users } from "./identity";

/**
 * Academia (Etapa 19).
 *
 * Dos capas bien separadas:
 * - Contenido educativo **global** (no pertenece a un usuario):
 *   `academy_categories` y `academy_contents`.
 * - Progreso **por usuario** sobre ese contenido: `academy_progress`
 *   (avance, estado y favoritos), con una única fila por usuario+contenido.
 *
 * Los enums viven en `src/lib/academy-shared.ts` (módulo puro, sin DB) para
 * que esquema, servidor y cliente compartan exactamente los mismos valores.
 */

/** Contenido educativo global (no pertenece a un usuario). */
export const academyCategories = pgTable(
  "academy_categories",
  {
    id: id(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    /** Clave de ícono (`src/components/academia/academy-icons.tsx`). */
    icon: text("icon").notNull().default("book"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("academy_categories_active_idx").on(t.isActive, t.sortOrder)],
);

export const academyContents = pgTable(
  "academy_contents",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => academyCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    kind: text("kind", { enum: ACADEMY_KINDS }).notNull().default("article"),
    /** Resumen de una línea para tarjetas y listados. */
    summary: text("summary"),
    /** Cuerpo en Markdown simplificado (## títulos, - listas, > notas). */
    body: text("body"),
    url: text("url"),
    durationMinutes: smallint("duration_minutes"),
    level: text("level", { enum: ACADEMY_LEVELS }).notNull().default("beginner"),
    /**
     * Estado de revisión editorial. En esta etapa todo el catálogo base entra
     * como `pending`: piezas introductorias y generales, sin recomendaciones
     * financieras complejas, a la espera de revisión con fuentes. La UI lo
     * muestra con transparencia.
     */
    reviewStatus: text("review_status", { enum: ACADEMY_REVIEW_STATUSES })
      .notNull()
      .default("pending"),
    /** Fuentes o notas de revisión (null mientras no haya revisión). */
    sources: text("sources"),
    /** Orden dentro de la categoría. */
    sortOrder: integer("sort_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("academy_contents_category_idx").on(t.categoryId, t.isPublished),
    index("academy_contents_kind_idx").on(t.kind, t.isPublished),
    index("academy_contents_featured_idx").on(t.isFeatured, t.isPublished),
  ],
);

/**
 * Progreso del usuario en la Academia (Etapa 19): avance, estado y favorito.
 *
 * Una sola fila por (usuario, contenido) — índice único — de modo que
 * "concluido" y "favorito" tengan una única fuente de verdad.
 * `progress_pct` es explícito: 1-99 = en progreso, 100 = concluido
 * (`statusForPct` en `academy-shared.ts`).
 */
export const academyProgress = pgTable(
  "academy_progress",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => academyContents.id, { onDelete: "cascade" }),
    status: text("status", { enum: ACADEMY_PROGRESS_STATUSES })
      .notNull()
      .default("in_progress"),
    progressPct: smallint("progress_pct").notNull().default(0),
    isFavorite: boolean("is_favorite").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("academy_progress_user_content_unique").on(t.userId, t.contentId),
    index("academy_progress_user_status_idx").on(t.userId, t.status),
    index("academy_progress_user_favorite_idx").on(t.userId, t.isFavorite),
    index("academy_progress_user_viewed_idx").on(t.userId, t.lastViewedAt),
    check("academy_progress_pct_range", sql`${t.progressPct} >= 0 AND ${t.progressPct} <= 100`),
  ],
);
