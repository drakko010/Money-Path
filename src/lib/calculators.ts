/**
 * Calculadoras (Etapa 15) — funciones puras, sin dependencias de DB.
 *
 * Todas las proyecciones se calculan en centavos (aritmética entera, redondeo
 * por paso) para consistencia con el núcleo monetario. Son SIMULACIONES
 * orientativas, nunca garantías.
 */

/** Redondeo mitad hacia arriba con signo. */
function round(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}

export interface CompoundInterestInput {
  initialMinor: number;
  contributionMinor: number;
  /** Tasa anual en porcentaje (p. ej. 10.5). */
  annualRatePct: number;
  /** Periodo en años. */
  years: number;
}

export interface CompoundInterestResult {
  contributedMinor: number;
  interestMinor: number;
  finalMinor: number;
}

/** Interés compuesto con aportes mensuales. */
export function compoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const months = Math.max(0, Math.round(input.years * 12));
  const monthlyRate = input.annualRatePct / 100 / 12;

  let balance = input.initialMinor;
  for (let m = 0; m < months; m += 1) {
    balance = round(balance * (1 + monthlyRate)) + input.contributionMinor;
  }

  const contributedMinor = input.initialMinor + input.contributionMinor * months;
  return {
    contributedMinor,
    interestMinor: balance - contributedMinor,
    finalMinor: balance,
  };
}

export interface GoalInput {
  targetMinor: number;
  currentMinor: number;
  years: number;
}

export interface GoalResult {
  neededMinor: number;
  months: number;
  perMonthMinor: number;
}

/** Aporte mensual necesario para alcanzar una meta (proyección simple). */
export function goalContribution(input: GoalInput): GoalResult {
  const months = Math.max(1, Math.round(input.years * 12));
  const neededMinor = Math.max(0, input.targetMinor - input.currentMinor);
  const perMonthMinor = Math.ceil(neededMinor / months);
  return { neededMinor, months, perMonthMinor };
}

export interface FirstGoalInput {
  targetMinor: number;
  monthlyMinor: number;
  annualRatePct: number;
}

export interface FirstGoalResult {
  months: number | null;
  /** Saldo al final de cada año (para la visualización). */
  perYear: Array<{ year: number; balanceMinor: number }>;
}

/** Construcción de patrimonio hacia un primer gran objetivo. */
export function firstGoal(input: FirstGoalInput): FirstGoalResult {
  const monthlyRate = input.annualRatePct / 100 / 12;
  const cap = 1200; // 100 años
  let balance = 0;
  const perYear: Array<{ year: number; balanceMinor: number }> = [];

  if (input.targetMinor <= 0) return { months: 0, perYear };

  for (let m = 1; m <= cap; m += 1) {
    balance = round(balance * (1 + monthlyRate)) + input.monthlyMinor;
    if (m % 12 === 0) perYear.push({ year: m / 12, balanceMinor: balance });
    if (balance >= input.targetMinor) {
      return { months: m, perYear };
    }
  }
  return { months: null, perYear };
}

export interface BuyVsRentInput {
  years: number;
  // Compra
  homePriceMinor: number;
  downPaymentPct: number;
  mortgageRatePct: number;
  mortgageYears: number;
  monthlyMaintenanceMinor: number;
  appreciationPct: number;
  // Renta
  monthlyRentMinor: number;
  rentIncreasePct: number;
  investReturnPct: number;
}

export interface BuyVsRentResult {
  buy: {
    downPaymentMinor: number;
    monthlyMortgageMinor: number;
    totalPaidMinor: number;
    endHomeValueMinor: number;
    remainingBalanceMinor: number;
    equityMinor: number;
    netCostMinor: number;
  };
  rent: {
    totalRentMinor: number;
    investedDownPaymentMinor: number;
    netCostMinor: number;
  };
  /** Negativo = comprar cuesta menos; positivo = rentar cuesta menos. */
  differenceMinor: number;
  winner: "buy" | "rent";
}

/** Pago mensual de una hipoteca a tasa fija. */
function mortgagePayment(principalMinor: number, annualRatePct: number, years: number): number {
  const i = annualRatePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (i === 0) return Math.ceil(principalMinor / n);
  const factor = Math.pow(1 + i, n);
  return round((principalMinor * i * factor) / (factor - 1));
}

/** Saldo restante de una hipoteca después de `months` pagos. */
function remainingBalance(principalMinor: number, annualRatePct: number, mortgageYears: number, months: number): number {
  const i = annualRatePct / 100 / 12;
  const n = Math.max(1, Math.round(mortgageYears * 12));
  const m = Math.min(months, n);
  if (i === 0) return Math.max(0, principalMinor - Math.ceil(principalMinor / n) * m);
  const factor = Math.pow(1 + i, n);
  const factorM = Math.pow(1 + i, m);
  return round(principalMinor * (factor - factorM) / (factor - 1));
}

/** Simulador comparativo comprar vs rentar a N años. */
export function buyVsRent(input: BuyVsRentInput): BuyVsRentResult {
  const years = Math.max(1, Math.round(input.years));
  const months = years * 12;

  // ── Comprar ──────────────────────────────────────────────────────
  const downPaymentMinor = round(input.homePriceMinor * (input.downPaymentPct / 100));
  const principalMinor = Math.max(0, input.homePriceMinor - downPaymentMinor);
  const monthlyMortgageMinor = mortgagePayment(principalMinor, input.mortgageRatePct, input.mortgageYears);

  const totalMortgagePaidMinor = monthlyMortgageMinor * Math.min(months, Math.round(input.mortgageYears * 12));
  const totalMaintenanceMinor = input.monthlyMaintenanceMinor * months;
  const totalPaidMinor = downPaymentMinor + totalMortgagePaidMinor + totalMaintenanceMinor;

  const endHomeValueMinor = round(input.homePriceMinor * Math.pow(1 + input.appreciationPct / 100, years));
  const remainingBalanceMinor = remainingBalance(principalMinor, input.mortgageRatePct, input.mortgageYears, months);
  const equityMinor = endHomeValueMinor - remainingBalanceMinor;
  const buyNetCostMinor = totalPaidMinor - equityMinor;

  // ── Rentar ───────────────────────────────────────────────────────
  let totalRentMinor = 0;
  for (let year = 0; year < years; year += 1) {
    const rentThisYear = round(input.monthlyRentMinor * Math.pow(1 + input.rentIncreasePct / 100, year));
    totalRentMinor += rentThisYear * 12;
  }
  const investedDownPaymentMinor = round(
    downPaymentMinor * Math.pow(1 + input.investReturnPct / 100, years),
  );
  const rentNetCostMinor = totalRentMinor - (investedDownPaymentMinor - downPaymentMinor);

  const differenceMinor = buyNetCostMinor - rentNetCostMinor;

  return {
    buy: {
      downPaymentMinor,
      monthlyMortgageMinor,
      totalPaidMinor,
      endHomeValueMinor,
      remainingBalanceMinor,
      equityMinor,
      netCostMinor: buyNetCostMinor,
    },
    rent: {
      totalRentMinor,
      investedDownPaymentMinor,
      netCostMinor: rentNetCostMinor,
    },
    differenceMinor,
    winner: buyNetCostMinor <= rentNetCostMinor ? "buy" : "rent",
  };
}
