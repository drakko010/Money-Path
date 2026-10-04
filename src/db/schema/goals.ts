import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, currency, id, softDelete, timestamps } from "./common";
import { users } from "./identity";

/** Fondos de emergencia del usuario. */
export const emergencyFunds = pgTable(
  "emergency_funds",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Fondo de emergencia"),
    targetAmount: amount("target_amount"),
    currency: currency(),
    currentAmount: amount("current_amount").default("0"),
    /** Meta alternativa expresada en meses de gastos. */
    targetMonths: numeric("target_months", { precision: 5, scale: 2 }),
    status: text("status", { enum: ["building", "complete", "paused"] })
      .notNull()
      .default("building"),
    lastContributionOn: date("last_contribution_on"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("emergency_funds_target_positive", sql`${t.targetAmount} > 0`),
    check("emergency_funds_current_not_negative", sql`${t.currentAmount} >= 0`),
    index("emergency_funds_user_idx").on(t.userId),
  ],
);

/** Metas de ahorro del usuario. */
export const goals = pgTable(
  "goals",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Categoría de la meta (Etapa 12). */
    category: text("category", {
      enum: [
        "viaje",
        "auto",
        "casa",
        "fondo_emergencia",
        "educacion",
        "inversion",
        "compra_personal",
        "otro",
      ],
    })
      .notNull()
      .default("otro"),
    targetAmount: amount("target_amount"),
    currency: currency(),
    currentAmount: amount("current_amount").default("0"),
    targetDate: date("target_date"),
    /** Prioridad 1 (alta) a 3 (baja); Etapa 12 usa 2 por defecto. */
    priority: smallint("priority").notNull().default(2),
    status: text("status", {
      enum: ["active", "achieved", "paused", "abandoned"],
    })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("goals_target_positive", sql`${t.targetAmount} > 0`),
    check("goals_current_not_negative", sql`${t.currentAmount} >= 0`),
    check("goals_priority_range", sql`${t.priority} >= 1 AND ${t.priority} <= 3`),
    index("goals_user_status_idx").on(t.userId, t.status),
    index("goals_user_priority_idx").on(t.userId, t.priority),
  ],
);

/** Aportaciones a una meta. */
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    amount: amount("amount"),
    currency: currency(),
    contributedOn: date("contributed_on").notNull(),
    source: text("source"),
    note: text("note"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("goal_contributions_amount_positive", sql`${t.amount} > 0`),
    index("goal_contributions_goal_idx").on(t.goalId),
    index("goal_contributions_user_date_idx").on(t.userId, t.contributedOn),
  ],
);
