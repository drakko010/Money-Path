/**
 * Money AI (Etapa 17) — tipos compartidos servidor/cliente.
 *
 * El asistente responde EXCLUSIVAMENTE con los datos reales del usuario;
 * nunca inventa transacciones, saldos ni patrimonio.
 */

export type IntentType =
  | "buy_afford"
  | "spend_category"
  | "why_no_savings"
  | "goal_needed"
  | "biggest_expense"
  | "reduce_expenses"
  | "goal_when"
  | "summary"
  | "unknown";

export interface NextStepRef {
  text: string;
  href: string;
}

/** Respuesta estructurada: Resumen → Explicación → Datos → Impacto → Próximo paso. */
export interface AIAnswer {
  intent: IntentType;
  summary: string;
  explanation: string;
  /** Datos reales del usuario que se usaron para responder. */
  dataUsed: string[];
  impact: string | null;
  nextStep: NextStepRef | null;
  /** Sugerencias de seguimiento. */
  suggestions: string[];
  /** true si faltó información y la respuesta lo indica. */
  needsMoreInfo: boolean;
}

export interface AISpendByCategory {
  name: string;
  totalMinor: number;
}

export interface AIGoalInfo {
  name: string;
  targetMinor: number;
  currentMinor: number;
  monthsLeft: number | null;
  perMonthNeededMinor: number | null;
  monthsToReachMinor: number | null;
}

export interface AIContext {
  currency: string;
  userName: string;
  monthLabel: string;
  monthlyIncomeMinor: number;
  monthlyExpensesMinor: number;
  surplusMinor: number;
  /** Gastos del mes actual agrupados por categoría. */
  spendByCategory: AISpendByCategory[];
  biggestExpense: AISpendByCategory | null;
  debtsTotalMinor: number;
  fundCurrentMinor: number;
  fundTargetMinor: number;
  goals: AIGoalInfo[];
  netWorthMinor: number;
  hasActualData: boolean;
  hasGoals: boolean;
  categoryNames: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Respuesta estructurada (solo assistant). */
  answer?: AIAnswer | null;
  createdAt: string;
}

export interface ConversationRef {
  id: string;
  title: string;
  updatedAt: string;
}
