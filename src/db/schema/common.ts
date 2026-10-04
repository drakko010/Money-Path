import { char, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";

/**
 * Columnas compartidas del modelo de datos de Money Path.
 *
 * Convenciones:
 * - IDs: UUID v4 generados en la aplicación (sin extender PostgreSQL).
 * - Auditoría: `created_at` y `updated_at` en todas las entidades;
 *   `updated_at` se refresca automáticamente al actualizar.
 * - Dinero: `numeric(18,2)` en disco; la aplicación calcula en centavos.
 * - Multi-moneda: todo monto va acompañado de su moneda (FK a `currencies`).
 * - Datos financieros: borrado suave (`deleted_at`) — nada se destruye sin
 *   confirmación explícita del usuario.
 */

export const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/** Monto monetario `numeric(18,2)` obligatorio. */
export const amount = (name: string) =>
  numeric(name, { precision: 18, scale: 2 }).notNull();

/** Monto monetario opcional (p. ej. pagos mínimos, valores estimados). */
export const amountNullable = (name: string) =>
  numeric(name, { precision: 18, scale: 2 });

/**
 * Moneda ISO 4217 que acompaña a cada monto. MXN por defecto; FK al
 * catálogo `currencies` para impedir códigos inventados.
 */
export const currency = () =>
  char("currency", { length: 3 })
    .notNull()
    .default("MXN")
    .references(() => currencies.code);

/** Tasas anuales / porcentajes con precisión (p. ej. 45.5000 %). */
export const rate = (name: string) =>
  numeric(name, { precision: 7, scale: 4 });
