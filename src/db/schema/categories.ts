import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { id, softDelete, timestamps } from "./common";
import { users } from "./identity";

/**
 * Categorías propias del usuario. Son estructuras (no registros
 * financieros), pero llevan borrado suave porque anclan historial.
 */
export const incomeCategories = pgTable(
  "income_categories",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    icon: text("icon"),
    /** Creadas por Money Path al registrar al usuario. */
    isSystem: boolean("is_system").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    unique("income_categories_user_name_unique").on(t.userId, t.name),
    index("income_categories_user_idx").on(t.userId),
  ],
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    icon: text("icon"),
    /** Gasto fijo o variable (arquitectura de referencia del producto). */
    kind: text("kind", { enum: ["fixed", "variable"] })
      .notNull()
      .default("variable"),
    /**
     * Marca la categoría como gasto esencial para el fondo de emergencia
     * (Etapa 11). Las discrecionales quedan fuera por defecto.
     */
    isEssential: boolean("is_essential").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    unique("expense_categories_user_name_unique").on(t.userId, t.name),
    index("expense_categories_user_idx").on(t.userId),
    index("expense_categories_user_kind_idx").on(t.userId, t.kind),
  ],
);
