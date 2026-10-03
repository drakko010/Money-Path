import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";

/** Contenido educativo global (no pertenece a un usuario). */
export const academyCategories = pgTable(
  "academy_categories",
  {
    id: id(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
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
    kind: text("kind", { enum: ["article", "video", "lesson", "guide"] })
      .notNull()
      .default("article"),
    body: text("body"),
    url: text("url"),
    durationMinutes: smallint("duration_minutes"),
    level: text("level", {
      enum: ["beginner", "intermediate", "advanced"],
    })
      .notNull()
      .default("beginner"),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("academy_contents_category_idx").on(t.categoryId, t.isPublished),
  ],
);
