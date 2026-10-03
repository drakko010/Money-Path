import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, amountNullable, currency, id, rate, softDelete, timestamps } from "./common";
import { users } from "./identity";
import { expenses } from "./transactions";

/** Deudas del usuario (tarjetas, préstamos, hipoteca…). */
export const debts = pgTable(
  "debts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creditor: text("creditor"),
    kind: text("kind", {
      enum: ["credit_card", "personal_loan", "mortgage", "auto_loan", "student_loan", "other"],
    })
      .notNull()
      .default("other"),
    initialAmount: amount("initial_amount"),
    currency: currency(),
    outstandingBalance: amount("outstanding_balance").default("0"),
    /** Tasa anual en porcentaje (p. ej. 45.5000). */
    annualInterestRate: rate("annual_interest_rate"),
    minimumPayment: amountNullable("minimum_payment"),
    dueDay: smallint("due_day"),
    startDate: date("start_date"),
    targetPayoffDate: date("target_payoff_date"),
    /** Prioridad de pago definida por el usuario (1 = más urgente, Etapa 10). */
    priority: smallint("priority").notNull().default(2),
    /** Número de parcelas pactadas, si aplica (Etapa 10). */
    totalInstallments: smallint("total_installments"),
    status: text("status", {
      enum: ["active", "paid_off", "defaulted", "cancelled"],
    })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("debts_initial_positive", sql`${t.initialAmount} > 0`),
    check("debts_balance_not_negative", sql`${t.outstandingBalance} >= 0`),
    check("debts_priority_range", sql`${t.priority} >= 1 AND ${t.priority} <= 3`),
    index("debts_user_status_idx").on(t.userId, t.status),
    index("debts_user_priority_idx").on(t.userId, t.priority),
  ],
);

/** Pagos aplicados a una deuda. */
export const debtPayments = pgTable(
  "debt_payments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    amount: amount("amount"),
    currency: currency(),
    paidOn: date("paid_on").notNull(),
    /** Gasto asociado, si el pago también se registró como movimiento. */
    expenseId: uuid("expense_id").references(() => expenses.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("debt_payments_amount_positive", sql`${t.amount} > 0`),
    index("debt_payments_debt_idx").on(t.debtId),
    index("debt_payments_user_date_idx").on(t.userId, t.paidOn),
  ],
);
