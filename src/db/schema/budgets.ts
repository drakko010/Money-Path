import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, currency, id, timestamps } from "./common";
import { expenseCategories } from "./categories";
import { users } from "./identity";

/**
 * Presupuestos por período y (opcionalmente) por categoría de gasto.
 * `expense_category_id = null` representa el presupuesto general del período.
 */
export const budgets = pgTable(
  "budgets",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name"),
    period: text("period", { enum: ["monthly", "weekly"] })
      .notNull()
      .default("monthly"),
    /** Inicio del período (primer día de la semana o del mes). */
    periodStart: date("period_start").notNull(),
    expenseCategoryId: uuid("expense_category_id").references(
      () => expenseCategories.id,
      { onDelete: "set null" },
    ),
    limitAmount: amount("limit_amount"),
    currency: currency(),
    status: text("status", { enum: ["active", "archived"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    check("budgets_limit_positive", sql`${t.limitAmount} > 0`),
    uniqueIndex("budgets_user_category_period_unique").on(
      t.userId,
      t.expenseCategoryId,
      t.periodStart,
    ),
    index("budgets_user_period_idx").on(t.userId, t.periodStart),
  ],
);
