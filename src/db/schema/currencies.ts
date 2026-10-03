import { boolean, char, integer, pgTable, text } from "drizzle-orm/pg-core";

/**
 * Catálogo de moedas soportadas (ISO 4217).
 *
 * Money Path lanza con MXN y está preparado para LATAM. Toda columna
 * monetaria del modelo hace referencia a esta tabla, de modo que nunca se
 * mezclan monedas silenciosamente: cada monto declara explícitamente la suya.
 */
export const currencies = pgTable("currencies", {
  code: char("code", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  /** Cantidad de decimales de la moneda (CLP/COP: 0). */
  decimals: integer("decimals").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
});
