/**
 * Money Path™ (Etapa 16) — lógica pura de análisis, sin DB.
 *
 * Transforma los datos financieros reales del usuario en una ruta de acción.
 * Toda recomendación se deriva exclusivamente de los datos existentes y las
 * proyecciones se marcan como estimaciones. No es asesoría financiera.
 */

export interface GoalLite {
  name: string;
  targetMinor: number;
  currentMinor: number;
  /** Meses restantes hasta el plazo (null si no tiene plazo). */
  monthsLeft: number | null;
}

export interface MoneyPathInput {
  currency: string;
  monthlyIncomeMinor: number;
  monthlyExpensesMinor: number;
  essentialMonthlyMinor: number;
  /** Ingreso − gastos. */
  surplusMinor: number;
  debtsTotalMinor: number;
  topDebtRate: number | null;
  topDebtName: string | null;
  fundCurrentMinor: number;
  fundTargetMinor: number;
  goals: GoalLite[];
  investmentsCurrentMinor: number;
  /** Fondo + inversiones. */
  savingsMinor: number;
  netWorthMinor: number;
  netWorthVariationMinor: number | null;
  /** true si hay movimientos reales (no solo el diagnóstico del onboarding). */
  hasActualData: boolean;
}

export type FindingType =
  | "overspend"
  | "debt"
  | "lowReserve"
  | "lowSavings"
  | "goalMismatch"
  | "netWorthGrowing"
  | "reorganize"
  | "onTrack";

export type Severity = "high" | "medium" | "positive";

export interface Finding {
  type: FindingType;
  severity: Severity;
  numbers: {
    overshootMinor?: number;
    debtsTotalMinor?: number;
    topDebtName?: string | null;
    topDebtRate?: number | null;
    reserveMonths?: number;
    fundGapMinor?: number;
    surplusMinor?: number;
    savingsRatePct?: number | null;
    goalName?: string;
    goalNeededMinor?: number;
    netWorthVariationMinor?: number;
  };
}

/** Orden base de prioridad por tipo (menor = más prioritario). */
const TYPE_RANK: Record<FindingType, number> = {
  overspend: 1,
  debt: 2,
  lowReserve: 3,
  lowSavings: 4,
  goalMismatch: 5,
  reorganize: 6,
  onTrack: 7,
  netWorthGrowing: 8,
};

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, positive: 2 };

/** Meses para alcanzar un objetivo ahorrando `monthlyMinor` por mes. */
export function estimateMonths(
  targetMinor: number,
  currentMinor: number,
  monthlyMinor: number,
): number | null {
  const needed = targetMinor - currentMinor;
  if (needed <= 0) return 0;
  if (monthlyMinor <= 0) return null;
  return Math.ceil(needed / monthlyMinor);
}

/** Analiza la situación y devuelve los hallazgos ordenados por prioridad. */
export function analyzeMoneyPath(input: MoneyPathInput): Finding[] {
  const findings: Finding[] = [];
  const income = input.monthlyIncomeMinor;
  const expenses = input.monthlyExpensesMinor;
  const surplus = input.surplusMinor;
  const essential = input.essentialMonthlyMinor > 0 ? input.essentialMonthlyMinor : expenses;

  // 1) Exceso de gastos: gastas más de lo que ingresas.
  if (expenses > income && income > 0) {
    findings.push({
      type: "overspend",
      severity: "high",
      numbers: { overshootMinor: expenses - income, surplusMinor: surplus },
    });
  }

  // 2) Deuda relevante: tasa alta o deuda grande frente al ingreso.
  if (input.debtsTotalMinor > 0) {
    const highRate = input.topDebtRate !== null && input.topDebtRate >= 40;
    const highRatio = income > 0 && input.debtsTotalMinor > income * 6;
    findings.push({
      type: "debt",
      severity: highRate || highRatio ? "high" : "medium",
      numbers: {
        debtsTotalMinor: input.debtsTotalMinor,
        topDebtName: input.topDebtName,
        topDebtRate: input.topDebtRate,
        surplusMinor: surplus,
      },
    });
  }

  // 3) Falta de reserva: el fondo cubre pocos meses de gastos esenciales.
  const reserveMonths = essential > 0 ? input.fundCurrentMinor / essential : 0;
  const fundGap = Math.max(0, input.fundTargetMinor - input.fundCurrentMinor);
  if (input.fundTargetMinor > 0) {
    if (reserveMonths < 1) {
      findings.push({ type: "lowReserve", severity: "high", numbers: { reserveMonths, fundGapMinor: fundGap, surplusMinor: surplus } });
    } else if (reserveMonths < 3) {
      findings.push({ type: "lowReserve", severity: "medium", numbers: { reserveMonths, fundGapMinor: fundGap, surplusMinor: surplus } });
    }
  }

  // 4) Baja capacidad de ahorro.
  if (income > 0) {
    const savingsRate = surplus / income;
    if (surplus <= 0) {
      findings.push({ type: "lowSavings", severity: "high", numbers: { surplusMinor: surplus, savingsRatePct: savingsRate * 100 } });
    } else if (savingsRate < 0.1) {
      findings.push({ type: "lowSavings", severity: "medium", numbers: { surplusMinor: surplus, savingsRatePct: savingsRate * 100 } });
    }
  }

  // 5) Meta incompatible con el presupuesto disponible.
  for (const goal of input.goals) {
    if (goal.monthsLeft === null || goal.monthsLeft <= 0) continue;
    const needed = Math.ceil(Math.max(0, goal.targetMinor - goal.currentMinor) / goal.monthsLeft);
    if (needed > 0 && surplus > 0 && needed > surplus) {
      findings.push({
        type: "goalMismatch",
        severity: "medium",
        numbers: { goalName: goal.name, goalNeededMinor: needed, surplusMinor: surplus },
      });
      break; // una sola señal de metas es suficiente
    }
  }

  // 6) Patrimonio evolucionando (señal positiva).
  if (input.netWorthVariationMinor !== null && input.netWorthVariationMinor > 0) {
    findings.push({
      type: "netWorthGrowing",
      severity: "positive",
      numbers: { netWorthVariationMinor: input.netWorthVariationMinor },
    });
  }

  // 7) Necesidad de reorganización: varios frentes abiertos a la vez.
  const openIssues = findings.filter((f) => f.severity !== "positive").length;
  if (openIssues >= 3) {
    findings.push({ type: "reorganize", severity: "medium", numbers: {} });
  }

  // Si no hay problemas, todo en orden.
  if (findings.filter((f) => f.severity !== "positive").length === 0) {
    findings.push({ type: "onTrack", severity: "positive", numbers: { surplusMinor: surplus } });
  }

  return findings.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      TYPE_RANK[a.type] - TYPE_RANK[b.type],
  );
}

/** Vista serializable de la ruta (lo que recibe la UI). */
export interface MoneyPathView {
  currency: string;
  input: MoneyPathInput;
  findings: Finding[];
  priority: Finding;
  plan: PriorityPlan;
}

/** Plan derivado del hallazgo prioritario (para "Acción recomendada" e "Impacto"). */
export interface PriorityPlan {
  /** Monto mensual sugerido para la acción (centavos). */
  monthlyAmountMinor: number;
  /** Objetivo al que apunta la acción (centavos), si aplica. */
  targetMinor: number | null;
  /** Meses estimados para alcanzar el objetivo con ese monto (null = no estimado). */
  months: number | null;
}

export function planForFinding(input: MoneyPathInput, finding: Finding): PriorityPlan {
  const surplus = Math.max(0, input.surplusMinor);
  switch (finding.type) {
    case "lowReserve": {
      const gap = finding.numbers.fundGapMinor ?? Math.max(0, input.fundTargetMinor - input.fundCurrentMinor);
      const monthly = surplus;
      return {
        monthlyAmountMinor: monthly,
        targetMinor: input.fundTargetMinor,
        months: monthly > 0 ? estimateMonths(input.fundTargetMinor, input.fundCurrentMinor, monthly) : null,
      };
    }
    case "debt": {
      const debt = finding.numbers.debtsTotalMinor ?? input.debtsTotalMinor;
      const monthly = surplus;
      return {
        monthlyAmountMinor: monthly,
        targetMinor: debt,
        months: monthly > 0 ? estimateMonths(debt, 0, monthly) : null,
      };
    }
    case "overspend": {
      return {
        monthlyAmountMinor: finding.numbers.overshootMinor ?? 0,
        targetMinor: null,
        months: null,
      };
    }
    case "lowSavings": {
      return { monthlyAmountMinor: surplus, targetMinor: null, months: null };
    }
    case "goalMismatch": {
      return {
        monthlyAmountMinor: finding.numbers.goalNeededMinor ?? 0,
        targetMinor: null,
        months: null,
      };
    }
    default:
      return { monthlyAmountMinor: surplus, targetMinor: null, months: null };
  }
}

/** Simulación "¿Qué pasa si reduzco mis gastos en X?" */
export interface SimulationInput {
  monthlyIncomeMinor: number;
  monthlyExpensesMinor: number;
  surplusMinor: number;
  essentialMonthlyMinor: number;
  fundCurrentMinor: number;
  fundTargetMinor: number;
}

export interface SimulationResult {
  newSurplusMinor: number;
  surplusIncreaseMinor: number;
  fundMonthsBefore: number | null;
  fundMonthsAfter: number | null;
  /** Meses que se adelanta el fondo (positivo = antes). */
  fundMonthsSaved: number | null;
}

export function simulateExpenseCut(input: SimulationInput, cutMinor: number): SimulationResult {
  const newSurplus = input.surplusMinor + cutMinor;
  const before = estimateMonths(input.fundTargetMinor, input.fundCurrentMinor, input.surplusMinor);
  const after = estimateMonths(input.fundTargetMinor, input.fundCurrentMinor, newSurplus);
  const saved = before !== null && after !== null ? before - after : null;
  return {
    newSurplusMinor: newSurplus,
    surplusIncreaseMinor: cutMinor,
    fundMonthsBefore: before,
    fundMonthsAfter: after,
    fundMonthsSaved: saved,
  };
}
