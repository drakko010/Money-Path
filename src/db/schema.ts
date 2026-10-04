import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Money Path — ponto de entrada do esquema (Etapa 3).
 *
 * O modelo está organizado por domínio em `src/db/schema/*` e re-exportado
 * aqui; o drizzle-kit usa este arquivo como entrada única.
 */

export * from "./schema/currencies";
export * from "./schema/common";
export * from "./schema/identity";
export * from "./schema/auth";
export * from "./schema/categories";
export * from "./schema/transactions";
export * from "./schema/debts";
export * from "./schema/goals";
export * from "./schema/investments";
export * from "./schema/networth";
export * from "./schema/path";
export * from "./schema/budgets";
export * from "./schema/notifications";
export * from "./schema/ai";
export * from "./schema/academy";
export * from "./schema/calculations";

/**
 * Configuração global da aplicação (Etapa 0): chave/valor.
 * Guarda defaults como região ativa e moeda base.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
