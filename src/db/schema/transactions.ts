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
import { amount, currency, id, softDelete, timestamps } from "./common";
import { expenseCategories, incomeCategories } from "./categories";
import { users } from "./identity";

/**
 * Compras a plazos (parcelamentos — Etapa 9). Cada mensualidad se
 * materializa como un gasto vinculado por `expenses.installment_id` +
 * `expenses.installment_number`, de modo que cada cuota impacta el mes que
 * le corresponde (nunca el total en un solo mes).
 */
export const installments = pgTable(
  "installments",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    totalAmount: amount("total_amount"),
    currency: currency(),
    totalInstallments: smallint("total_installments").notNull(),
    paidInstallments: smallint("paid_installments").notNull().default(0),
    firstDueDate: date("first_due_date").notNull(),
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    /** Método de pago de la compra (Etapa 9). */
    paymentMethod: text("payment_method", {
      enum: ["credit_card", "debit_card", "cash", "bank_transfer", "other"],
    })
      .notNull()
      .default("credit_card"),
    status: text("status", { enum: ["active", "completed", "cancelled"] })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("installments_total_positive", sql`${t.totalAmount} > 0`),
    check("installments_count_positive", sql`${t.totalInstallments} > 0`),
    check(
      "installments_paid_not_greater",
      sql`${t.paidInstallments} >= 0 AND ${t.paidInstallments} <= ${t.totalInstallments}`,
    ),
    index("installments_user_status_idx").on(t.userId, t.status),
    index("installments_user_due_idx").on(t.userId, t.firstDueDate),
    index("installments_category_idx").on(t.categoryId),
  ],
);

/**
 * Plantillas de movimientos recurrentes (ingresos o gastos). Generan
 * registros concretos en `income` / `expenses` según su cadencia.
 */
export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    incomeCategoryId: uuid("income_category_id").references(
      () => incomeCategories.id,
      { onDelete: "set null" },
    ),
    expenseCategoryId: uuid("expense_category_id").references(
      () => expenseCategories.id,
      { onDelete: "set null" },
    ),
    description: text("description").notNull(),
    amount: amount("amount"),
    currency: currency(),
    frequency: text("frequency", {
      enum: ["weekly", "biweekly", "monthly", "bimonthly", "quarterly", "yearly"],
    }).notNull(),
    dayOfMonth: smallint("day_of_month"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    nextOccurrence: date("next_occurrence").notNull(),
    lastGeneratedOn: date("last_generated_on"),
    status: text("status", {
      enum: ["active", "paused", "completed", "cancelled"],
    })
      .notNull()
      .default("active"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("recurring_amount_positive", sql`${t.amount} > 0`),
    index("recurring_user_schedule_idx").on(t.userId, t.status, t.nextOccurrence),
  ],
);

/** Ingresos registrados por el usuario. */
export const income = pgTable(
  "income",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => incomeCategories.id, {
      onDelete: "set null",
    }),
    /** Vínculo a la plantilla recurrente que generó el movimiento. */
    recurringId: uuid("recurring_id").references(
      () => recurringTransactions.id,
      { onDelete: "set null" },
    ),
    description: text("description").notNull(),
    amount: amount("amount"),
    currency: currency(),
    occurredOn: date("occurred_on").notNull(),
    status: text("status", { enum: ["received", "pending", "cancelled"] })
      .notNull()
      .default("received"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("income_amount_positive", sql`${t.amount} > 0`),
    index("income_user_date_idx").on(t.userId, t.occurredOn),
    index("income_user_status_idx").on(t.userId, t.status),
    index("income_category_idx").on(t.categoryId),
  ],
);

/** Gastos registrados por el usuario. */
export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    recurringId: uuid("recurring_id").references(
      () => recurringTransactions.id,
      { onDelete: "set null" },
    ),
    installmentId: uuid("installment_id").references(() => installments.id, {
      onDelete: "set null",
    }),
    /** Número de la mensualidad dentro del parcelamento (1..N). */
    installmentNumber: smallint("installment_number"),
    description: text("description").notNull(),
    amount: amount("amount"),
    currency: currency(),
    occurredOn: date("occurred_on").notNull(),
    /** Tipo del gasto: fijo o variable (Etapa 7; se precarga de la categoría). */
    kind: text("kind", { enum: ["fixed", "variable"] })
      .notNull()
      .default("variable"),
    status: text("status", { enum: ["paid", "pending", "cancelled"] })
      .notNull()
      .default("paid"),
    note: text("note"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    index("expenses_user_date_idx").on(t.userId, t.occurredOn),
    index("expenses_user_status_idx").on(t.userId, t.status),
    index("expenses_category_idx").on(t.categoryId),
    index("expenses_installment_idx").on(t.installmentId),
    index("expenses_user_kind_idx").on(t.userId, t.kind),
  ],
);

/** Cobros futuros: dinero por recibir con fecha estimada. */
export const futureReceipts = pgTable(
  "future_receipts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    counterparty: text("counterparty"),
    amount: amount("amount"),
    currency: currency(),
    expectedOn: date("expected_on").notNull(),
    /** Ingreso creado cuando el cobro se concreta. */
    receivedIncomeId: uuid("received_income_id").references(() => income.id, {
      onDelete: "set null",
    }),
    /** Plantilla recurrente que generó el cobro (Etapa 8); anti-duplicados. */
    recurringId: uuid("recurring_id").references(() => recurringTransactions.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: ["pending", "received", "cancelled"] })
      .notNull()
      .default("pending"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check("future_receipts_amount_positive", sql`${t.amount} > 0`),
    index("future_receipts_user_expected_idx").on(t.userId, t.expectedOn),
    index("future_receipts_recurring_idx").on(t.recurringId),
  ],
);
