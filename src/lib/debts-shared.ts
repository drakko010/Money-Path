/**
 * Deudas (Etapa 10) — tipos y simulación pura compartida servidor/cliente.
 * La simulación de estrategias es orientación: NUNCA ejecuta pagos.
 */

export type DebtKind =
  | "credit_card"
  | "personal_loan"
  | "mortgage"
  | "auto_loan"
  | "student_loan"
  | "other";

export const DEBT_KINDS: DebtKind[] = [
  "credit_card",
  "personal_loan",
  "mortgage",
  "auto_loan",
  "student_loan",
  "other",
];

export function isDebtKind(value: string): value is DebtKind {
  return DEBT_KINDS.includes(value as DebtKind);
}

export type DebtPriority = 1 | 2 | 3;

export const SIMULATION_MONTH_CAP = 600;

export interface StrategyDebtInput {
  id: string;
  name: string;
  balanceMinor: number;
  /** Tasa anual en porcentaje (p. ej. 45.5 → 45.5% anual). */
  annualRate: number;
  minimumMinor: number;
}

export interface StrategyPayoffEntry {
  id: string;
  name: string;
  month: number;
}

export interface StrategyResult {
  /** Meses hasta quedar libre de deudas (null si no converge). */
  months: number | null;
  totalInterestMinor: number;
  totalPaidMinor: number;
  /** Mes en que se liquida la primera deuda (motivación bola de nieve). */
  firstPayoff: StrategyPayoffEntry | null;
  /** Orden de liquidación. */
  payoffOrder: StrategyPayoffEntry[];
}

/**
 * Simulación mensual con capitalización simple:
 * cada mes se aplica la tasa mensual al saldo, se paga el mínimo de cada
 * deuda viva y el excedente se asigna según el orden de la estrategia
 * (avalancha: mayor tasa primero; bola de nieve: menor saldo primero).
 * Cuando una deuda se liquida, su mínimo se rueda a la siguiente.
 */
export function simulateStrategy(
  inputs: StrategyDebtInput[],
  extraMinor: number,
  mode: "avalanche" | "snowball",
): StrategyResult {
  const working = inputs
    .filter((input) => input.balanceMinor > 0)
    .map((input) => ({
      id: input.id,
      name: input.name,
      balance: input.balanceMinor,
      rate: input.annualRate,
      minimum: Math.max(0, input.minimumMinor),
    }));

  if (working.length === 0) {
    return { months: 0, totalInterestMinor: 0, totalPaidMinor: 0, firstPayoff: null, payoffOrder: [] };
  }

  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: StrategyPayoffEntry[] = [];
  let firstPayoff: StrategyPayoffEntry | null = null;

  for (let month = 1; month <= SIMULATION_MONTH_CAP; month += 1) {
    // 1) Interés del mes sobre saldos vivos.
    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const interest = Math.round(debt.balance * (debt.rate / 100 / 12));
      debt.balance += interest;
      totalInterest += interest;
    }

    // 2) Orden según la estrategia (solo deudas vivas).
    const ordered = working
      .filter((debt) => debt.balance > 0)
      .sort((a, b) => {
        if (mode === "avalanche") {
          return b.rate - a.rate || a.balance - b.balance;
        }
        return a.balance - b.balance || b.rate - a.rate;
      });
    if (ordered.length === 0) break;

    // 3) Fondo del mes: excedente + mínimos de las deudas vivas.
    let pool =
      Math.max(0, extraMinor) + ordered.reduce((acc, debt) => acc + debt.minimum, 0);

    // 4) Pago en cascada según el orden (mínimos + rodado implícito).
    for (const debt of ordered) {
      if (pool <= 0) break;
      const payment = Math.min(debt.balance, pool);
      debt.balance -= payment;
      pool -= payment;
      totalPaid += payment;
      if (debt.balance <= 0) {
        const entry = { id: debt.id, name: debt.name, month };
        payoffOrder.push(entry);
        if (!firstPayoff) firstPayoff = entry;
      }
    }

    if (working.every((debt) => debt.balance <= 0)) {
      return {
        months: month,
        totalInterestMinor: totalInterest,
        totalPaidMinor: totalPaid,
        firstPayoff,
        payoffOrder,
      };
    }
  }

  // No converge: los pagos no alcanzan a cubrir los intereses.
  return { months: null, totalInterestMinor: totalInterest, totalPaidMinor: totalPaid, firstPayoff, payoffOrder };
}
