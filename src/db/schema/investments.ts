import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, amountNullable, currency, id, rate, softDelete, timestamps } from "./common";
import { users } from "./identity";

/** Cuentas donde el usuario invierte (casa de bolsa, banco, AFORE…). */
export const investmentAccounts = pgTable(
  "investment_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    institution: text("institution").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type", {
      enum: ["brokerage", "bank", "afore", "crypto", "other"],
    })
      .notNull()
      .default("other"),
    /** Moneda base de la cuenta. */
    currency: currency(),
    /** Saldo disponible en la cuenta (Etapa 13). */
    balance: amountNullable("balance"),
    openedOn: date("opened_on"),
    status: text("status", { enum: ["active", "closed"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("investment_accounts_user_idx").on(t.userId)],
);

/** Instrumentos de inversión del usuario. */
export const investments = pgTable(
  "investments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => investmentAccounts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    instrumentType: text("instrument_type", {
      enum: ["cetes", "fund", "etf", "stock", "bond", "crypto", "other"],
    })
      .notNull()
      .default("other"),
    investedAmount: amount("invested_amount"),
    currency: currency(),
    currentValue: amountNullable("current_value"),
    /** Cantidad de títulos/participaciones (Etapa 13). */
    quantity: numeric("quantity", { precision: 18, scale: 6 }),
    /** Precio promedio de compra por unidad (Etapa 13). */
    averagePrice: amountNullable("average_price"),
    /** Tasa anual esperada/real en porcentaje. */
    annualRate: rate("annual_rate"),
    startDate: date("start_date"),
    maturityDate: date("maturity_date"),
    status: text("status", {
      enum: ["active", "matured", "sold", "cancelled"],
    })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("investments_invested_positive", sql`${t.investedAmount} > 0`),
    index("investments_user_status_idx").on(t.userId, t.status),
    index("investments_account_idx").on(t.accountId),
  ],
);

/** Movimientos de una inversión (aportes, retiros, rendimientos…). */
export const investmentTransactions = pgTable(
  "investment_transactions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    investmentId: uuid("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["contribution", "withdrawal", "interest", "dividend", "fee"],
    }).notNull(),
    amount: amount("amount"),
    currency: currency(),
    occurredOn: date("occurred_on").notNull(),
    note: text("note"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("investment_transactions_amount_positive", sql`${t.amount} > 0`),
    index("investment_transactions_investment_idx").on(t.investmentId),
    index("investment_transactions_user_date_idx").on(t.userId, t.occurredOn),
  ],
);
