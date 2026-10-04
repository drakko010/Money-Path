import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, currency, id, softDelete, timestamps } from "./common";
import { expenseCategories } from "./categories";
import { users } from "./identity";

/** Notificaciones del plan y de movimientos del usuario. */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    channel: text("channel", { enum: ["in_app", "email", "push"] })
      .notNull()
      .default("in_app"),
    status: text("status", {
      enum: ["pending", "sent", "read", "dismissed"],
    })
      .notNull()
      .default("pending"),
    metadata: jsonb("metadata"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("notifications_user_status_idx").on(t.userId, t.status, t.createdAt),
  ],
);

/**
 * Suscripciones que el usuario paga (streaming, apps, servicios…).
 * Son gastos fijos de ciclo conocido que alimentan el presupuesto.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceName: text("service_name").notNull(),
    provider: text("provider"),
    amount: amount("amount"),
    currency: currency(),
    billingCycle: text("billing_cycle", {
      enum: ["weekly", "monthly", "quarterly", "yearly"],
    })
      .notNull()
      .default("monthly"),
    nextBillingDate: date("next_billing_date"),
    expenseCategoryId: uuid("expense_category_id").references(
      () => expenseCategories.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: ["active", "paused", "cancelled"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("subscriptions_amount_positive", sql`${t.amount} > 0`),
    index("subscriptions_user_status_idx").on(t.userId, t.status),
  ],
);
