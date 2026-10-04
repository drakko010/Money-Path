import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { users } from "./identity";

/**
 * Estados del Money Path™: fotos de la situación del usuario que alimentan
 * su ruta de acción. La Etapa 5 crea el primer estado desde el onboarding;
 * el motor de la ruta llegará en su propia etapa.
 */
export const moneyPathStates = pgTable(
  "money_path_states",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Origen del estado ("onboarding" por ahora). */
    source: text("source", { enum: ["onboarding", "manual", "auto"] })
      .notNull()
      .default("onboarding"),
    /** Situación financiera capturada (montos en centavos + objetivo). */
    state: jsonb("state").notNull(),
    ...timestamps,
  },
  (t) => [index("money_path_states_user_idx").on(t.userId, t.createdAt)],
);
