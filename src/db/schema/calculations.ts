import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { users } from "./identity";

/**
 * Historial de calculadoras usadas por el usuario (interés compuesto,
 * pago de deudas, meta de ahorro…). Entradas y resultados se guardan como
 * JSONB: la lógica vive en la aplicación, el dato queda auditable.
 */
export const calculations = pgTable(
  "calculations",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "compound_interest",
        "debt_payoff",
        "savings_goal",
        "installment_cost",
        "emergency_fund",
        "other",
      ],
    }).notNull(),
    inputs: jsonb("inputs").notNull(),
    result: jsonb("result").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [index("calculations_user_kind_idx").on(t.userId, t.kind, t.createdAt)],
);
