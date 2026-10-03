/**
 * Constantes de parcelas compartidas entre servidor y cliente (sin DB).
 */

export const PAYMENT_METHODS = [
  "credit_card",
  "debit_card",
  "cash",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export const MAX_INSTALLMENTS = 120;
