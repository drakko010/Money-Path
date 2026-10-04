/**
 * Money Path™ — preview del próximo paso (Etapa 6).
 *
 * Reglas simples y transparentes sobre los datos reales del usuario.
 * No hay recomendaciones financieras complejas: solo orientación clara.
 * Los textos llegan ya con montos formateados desde quien llama.
 */

export interface NextStepInput {
  onboardingCompleted: boolean;
  income: number; // centavos
  expenses: number; // centavos
  hasDebts: boolean;
  debtsTotal: number; // centavos
  reserveCurrent: number; // centavos
  reserveTarget: number; // centavos
  savingsInvestment: number; // centavos
}

export type NextStepKind =
  | "incompleto"
  | "gastos_exceden"
  | "deudas"
  | "fondo"
  | "invertir"
  | "patrimonio";

export interface NextStep {
  kind: NextStepKind;
  href: string;
}

/**
 * Decide el próximo paso con una escalera de prioridades:
 * 1. diagnóstico incompleto → completarlo;
 * 2. gastos > ingresos → equilibrio;
 * 3. deudas → plan de pago;
 * 4. reserva bajo la meta → fortalecerla;
 * 5. sin ahorro/inversión → primer paso;
 * 6. estable → seguir construyendo patrimonio.
 */
export function deriveNextStep(input: NextStepInput): NextStep {
  if (!input.onboardingCompleted) {
    return { kind: "incompleto", href: "/onboarding" };
  }

  if (input.expenses > input.income) {
    return { kind: "gastos_exceden", href: "/app/presupuesto" };
  }

  if (input.hasDebts && input.debtsTotal > 0) {
    return { kind: "deudas", href: "/app/deudas" };
  }

  if (input.reserveCurrent < input.reserveTarget) {
    return { kind: "fondo", href: "/app/fondo" };
  }

  if (input.savingsInvestment <= 0) {
    return { kind: "invertir", href: "/app/inversiones" };
  }

  return { kind: "patrimonio", href: "/app/patrimonio" };
}
