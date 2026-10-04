import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, amountNullable, currency, id, softDelete, timestamps } from "./common";
import { debts } from "./debts";
import { users } from "./identity";

/** Bienes del usuario (casa, auto, efectivo…). */
export const assets = pgTable(
  "assets",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["real_estate", "vehicle", "cash", "investment", "other"],
    })
      .notNull()
      .default("other"),
    name: text("name").notNull(),
    estimatedValue: amount("estimated_value"),
    currency: currency(),
    acquiredOn: date("acquired_on"),
    note: text("note"),
    /**
     * Origen de la valuación (Etapa 14). `manual` por ahora; `external`
     * preparado para futura integración con fuentes externas de evaluación
     * (p. ej. valuación de vehículos).
     */
    valuationSource: text("valuation_source", { enum: ["manual", "external"] })
      .notNull()
      .default("manual"),
    /** Referencia/identificador de la fuente externa (cuando aplique). */
    externalReference: text("external_reference"),
    status: text("status", { enum: ["active", "sold", "removed"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("assets_value_positive", sql`${t.estimatedValue} > 0`),
    index("assets_user_status_idx").on(t.userId, t.status),
  ],
);

/** Pasivos del usuario (deudas de largo plazo, préstamos…). */
export const liabilities = pgTable(
  "liabilities",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["financing", "personal_loan", "credit_card", "other"],
    })
      .notNull()
      .default("other"),
    name: text("name").notNull(),
    outstandingAmount: amount("outstanding_amount").default("0"),
    currency: currency(),
    monthlyPayment: amountNullable("monthly_payment"),
    dueDay: smallint("due_day"),
    /** Vínculo opcional al módulo de deudas. */
    debtId: uuid("debt_id").references(() => debts.id, { onDelete: "set null" }),
    status: text("status", { enum: ["active", "settled", "removed"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("liabilities_amount_not_negative", sql`${t.outstandingAmount} >= 0`),
    index("liabilities_user_idx").on(t.userId),
  ],
);

/**
 * Foto histórica del patrimonio: activos − pasivos por fecha.
 * `net_worth` puede ser negativo (patrimonio negativo), sin constraint.
 */
export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    assetsTotal: amount("assets_total").default("0"),
    liabilitiesTotal: amount("liabilities_total").default("0"),
    netWorth: amount("net_worth").default("0"),
    currency: currency(),
    ...timestamps,
  },
  (t) => [
    unique("net_worth_snapshots_user_date_unique").on(t.userId, t.snapshotDate),
    index("net_worth_snapshots_user_idx").on(t.userId, t.snapshotDate),
  ],
);
