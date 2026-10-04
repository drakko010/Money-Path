/**
 * Money AI (Etapa 17) — motor de respuestas, función pura sobre el contexto.
 *
 * Detecta la intención de la pregunta y responde SOLO con los datos reales
 * del contexto (nunca inventa transacciones, saldos ni patrimonio). Cuando
 * falta información, lo indica explícitamente.
 */

import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { AIAnswer, AIContext, IntentType } from "./types";

type Dict = ReturnType<typeof getDictionary>;

function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fmt(minor: number, currency: string): string {
  return formatMoney(minor, { currency: currency as CurrencyCode });
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/* ── Detección de intención ──────────────────────────────────────────── */

export function detectIntent(message: string): IntentType {
  const q = norm(message);
  if (/puedo comprar|comprar esto|me alcanza|puedo permitirme|alcanza para|comprar algo de/.test(q)) return "buy_afford";
  if (/cuanto necesito (ahorrar|guardar|juntar)|cuanto (necesito|me falta) para|necesito ahorrar para/.test(q)) return "goal_needed";
  if (/cuando (voy a |lograre |alcanzare )?(alcanzar|lograr|llegar)|cuando alcanzare|en cuanto tiempo/.test(q)) return "goal_when";
  if (/mayor gasto|gasto mas grande|lo que mas gasto|mas gasto/.test(q)) return "biggest_expense";
  if (/por que no (logro |puedo )?ahorro|no logro ahorrar|no puedo ahorrar/.test(q)) return "why_no_savings";
  if (/reducir (mis )?gastos|bajar (mis )?gastos|recortar gastos|gastar menos|ahorrar mas/.test(q)) return "reduce_expenses";
  if (/cuanto gaste|gaste en|gasto en|cuanto.*gast/.test(q)) return "spend_category";
  if (/resumen|panorama|como estoy|mi situacion|como voy/.test(q)) return "summary";
  return "unknown";
}

/* ── Extracción de precio ────────────────────────────────────────────── */

export function extractPriceMinor(message: string): number | null {
  // Busca patrones como $3,000 / 3,000.50 / 3000 / $ 12,500.00
  const matches = message.replace(/\s/g, "").match(/\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?|\$?\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return null;
  const raw = matches[matches.length - 1].replace(/[$,\s]/g, "");
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100);
}

/* ── Coincidencia de categorías de gasto ─────────────────────────────── */

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  comida: ["comida", "super", "despensa", "alimento", "restaurante", "comer", "grocery"],
  transporte: ["transporte", "gasolina", "uber", "metro", "auto", "coche", "movilidad", "taxi"],
  renta: ["renta", "hipoteca", "alquiler", "casa", "departamento", "vivienda"],
  servicios: ["servicio", "luz", "agua", "gas", "electricidad", "internet", "telefono"],
  entretenimiento: ["entretenimiento", "diversion", "cine", "salida", "ocio", "streaming"],
  salud: ["salud", "medico", "farmacia", "doctor", "medicina"],
  educacion: ["educacion", "escuela", "curso", "colegiatura", "clase"],
  suscripciones: ["suscripcion", "netflix", "plataforma"],
};

const STOPWORDS = new Set([
  "cuanto", "gaste", "gasto", "este", "mes", "cual", "porque", "que", "como",
  "mi", "mis", "en", "de", "la", "el", "los", "las", "para", "por", "unos",
]);

export function findSpendCategories(message: string, categoryNames: string[]): string[] {
  const nq = norm(message);
  const afterEn = nq.includes(" en ") ? nq.slice(nq.lastIndexOf(" en ") + 4) : nq;
  const words = afterEn.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  if (words.length === 0) return [];

  // Expande sinónimos.
  const terms = new Set<string>(words);
  for (const word of words) {
    for (const group of Object.values(CATEGORY_SYNONYMS)) {
      if (group.some((synonym) => synonym === word || word.includes(synonym) || synonym.includes(word))) {
        for (const synonym of group) terms.add(synonym);
      }
    }
  }

  const matched: string[] = [];
  for (const name of categoryNames) {
    const nc = norm(name);
    const hit = Array.from(terms).some((term) => term.length >= 3 && (nc.includes(term) || term.includes(nc)));
    if (hit) matched.push(name);
  }
  return matched;
}

/* ── Respuestas por intención ────────────────────────────────────────── */

export function answerQuestion(context: AIContext, message: string): AIAnswer {
  const dict: Dict = getDictionary();
  const t = dict.moneyAI.intents;
  const currency = context.currency;
  const m = (minor: number) => fmt(minor, currency);
  const intent = detectIntent(message);
  const suggestions = [...dict.moneyAI.quick];

  const base: Omit<AIAnswer, "intent" | "summary" | "explanation"> = {
    dataUsed: [],
    impact: null,
    nextStep: null,
    suggestions: [],
    needsMoreInfo: false,
  };

  switch (intent) {
    case "buy_afford": {
      const price = extractPriceMinor(message);
      if (price === null) {
        return {
          ...base,
          intent,
          summary: t.buyAfford.needsPriceSummary,
          explanation: t.buyAfford.needsPriceExplanation,
          suggestions,
          needsMoreInfo: true,
        };
      }
      const surplus = context.surplusMinor;
      const savings = context.fundCurrentMinor; // ahorro líquido disponible
      if (price <= surplus) {
        return {
          ...base,
          intent,
          summary: t.buyAfford.canAffordSummary,
          explanation: fill(t.buyAfford.canAffordExplanation, { price: m(price), surplus: m(surplus) }),
          dataUsed: [`${dict.moneyAI.contextLabels.balance}: ${m(surplus)}`],
          impact: fill(t.buyAfford.canAffordImpact, { left: m(surplus - price) }),
          nextStep: { text: "Revisa tu presupuesto", href: "/app/presupuesto" },
          suggestions,
        };
      }
      if (price <= savings) {
        return {
          ...base,
          intent,
          summary: t.buyAfford.useSavingsSummary,
          explanation: fill(t.buyAfford.useSavingsExplanation, { price: m(price), surplus: m(surplus), savings: m(savings) }),
          dataUsed: [`${dict.moneyAI.contextLabels.fund}: ${m(savings)}`, `${dict.moneyAI.contextLabels.balance}: ${m(surplus)}`],
          impact: fill(t.buyAfford.useSavingsImpact, { savings: m(savings), left: m(savings - price) }),
          nextStep: { text: "Revisa tu fondo de emergencia", href: "/app/fondo" },
          suggestions,
        };
      }
      const months = surplus > 0 ? Math.ceil(price / surplus) : 6;
      const perMonth = surplus > 0 ? surplus : Math.ceil(price / months);
      return {
        ...base,
        intent,
        summary: t.buyAfford.cantAffordSummary,
        explanation: fill(t.buyAfford.cantAffordExplanation, { price: m(price), surplus: m(surplus), savings: m(savings) }),
        dataUsed: [`${dict.moneyAI.contextLabels.balance}: ${m(surplus)}`, `${dict.moneyAI.contextLabels.fund}: ${m(savings)}`],
        impact: fill(t.buyAfford.cantAffordImpact, { perMonth: m(perMonth), months: String(months) }),
        nextStep: { text: "Arma un plan de ahorro", href: "/app/metas" },
        suggestions,
      };
    }

    case "spend_category": {
      if (context.spendByCategory.length === 0) {
        return {
          ...base,
          intent,
          summary: t.spendCategory.noDataSummary,
          explanation: t.spendCategory.noDataExplanation,
          suggestions,
          needsMoreInfo: true,
        };
      }
      const matched = findSpendCategories(message, context.categoryNames);
      if (matched.length === 0) {
        return {
          ...base,
          intent,
          summary: t.spendCategory.noMatchSummary,
          explanation: fill(t.spendCategory.noMatchExplanation, {
            query: message.trim(),
            categories: context.categoryNames.join(", "),
          }),
          dataUsed: [`${dict.moneyAI.contextLabels.expenses} (${context.monthLabel})`],
          suggestions,
          needsMoreInfo: true,
        };
      }
      const rows = context.spendByCategory.filter((row) => matched.includes(row.name));
      const total = rows.reduce((acc, row) => acc + row.totalMinor, 0);
      const count = rows.length;
      return {
        ...base,
        intent,
        summary: fill(t.spendCategory.summary, { amount: m(total), categories: rows.map((row) => row.name).join(", ") }),
        explanation: fill(t.spendCategory.explanation, { month: context.monthLabel, amount: m(total), count: String(count) }),
        dataUsed: rows.map((row) => `${row.name}: ${m(row.totalMinor)}`),
        nextStep: { text: "Revisa tus gastos", href: "/app/presupuesto" },
        suggestions,
      };
    }

    case "why_no_savings": {
      const income = context.monthlyIncomeMinor;
      const expenses = context.monthlyExpensesMinor;
      const surplus = context.surplusMinor;
      const biggest = context.biggestExpense;
      const pct = income > 0 ? (surplus / income) * 100 : 0;
      const biggestLabel = biggest ? biggest.name : "—";
      const biggestAmount = biggest ? m(biggest.totalMinor) : "—";
      const dataUsed = [
        `${dict.moneyAI.contextLabels.income}: ${m(income)}`,
        `${dict.moneyAI.contextLabels.expenses}: ${m(expenses)}`,
        ...(biggest ? [`${biggest.name}: ${m(biggest.totalMinor)}`] : []),
      ];
      if (surplus < 0) {
        return {
          ...base,
          intent,
          summary: t.whyNoSavings.negativeSummary,
          explanation: fill(t.whyNoSavings.negativeExplanation, {
            income: m(income), expenses: m(expenses), gap: m(-surplus),
            biggest: biggestLabel, biggestAmount,
          }),
          dataUsed,
          impact: biggest ? fill(t.whyNoSavings.impact, { amount: m(biggest.totalMinor) }) : null,
          nextStep: { text: "Revisa tu presupuesto", href: "/app/presupuesto" },
          suggestions,
        };
      }
      if (pct < 10) {
        return {
          ...base,
          intent,
          summary: t.whyNoSavings.lowSummary,
          explanation: fill(t.whyNoSavings.lowExplanation, {
            income: m(income), expenses: m(expenses), surplus: m(surplus), pct: pct.toFixed(1),
            biggest: biggestLabel, biggestAmount,
          }),
          dataUsed,
          impact: biggest ? fill(t.whyNoSavings.impact, { amount: m(biggest.totalMinor) }) : null,
          nextStep: { text: "Reduce tus gastos", href: "/app/presupuesto" },
          suggestions,
        };
      }
      return {
        ...base,
        intent,
        summary: t.whyNoSavings.okSummary,
        explanation: fill(t.whyNoSavings.okExplanation, { surplus: m(surplus), pct: pct.toFixed(1) }),
        dataUsed,
        nextStep: { text: "Destínalo a una meta", href: "/app/metas" },
        suggestions,
      };
    }

    case "goal_needed": {
      if (!context.hasGoals || context.goals.length === 0) {
        return {
          ...base,
          intent,
          summary: t.goalNeeded.noGoalsSummary,
          explanation: t.goalNeeded.noGoalsExplanation,
          nextStep: { text: "Crea tu primera meta", href: "/app/metas" },
          suggestions,
          needsMoreInfo: true,
        };
      }
      const goal = context.goals[0];
      const remaining = Math.max(0, goal.targetMinor - goal.currentMinor);
      const perMonth = goal.perMonthNeededMinor ?? (context.surplusMinor > 0 ? Math.min(remaining, context.surplusMinor) : 0);
      const deadline = goal.monthsLeft === null ? t.goalNeeded.noDeadline : ` (${goal.monthsLeft} meses)`;
      return {
        ...base,
        intent,
        summary: fill(t.goalNeeded.summary, { goal: goal.name, perMonth: m(perMonth) }),
        explanation: fill(t.goalNeeded.explanation, {
          goal: goal.name, target: m(goal.targetMinor), current: m(goal.currentMinor),
          remaining: m(remaining), perMonth: m(perMonth), deadline,
        }),
        dataUsed: [`${goal.name}: ${m(goal.currentMinor)} / ${m(goal.targetMinor)}`],
        nextStep: { text: "Aporta a tu meta", href: "/app/metas" },
        suggestions,
      };
    }

    case "biggest_expense": {
      if (!context.biggestExpense) {
        return {
          ...base,
          intent,
          summary: t.biggestExpense.noDataSummary,
          explanation: t.biggestExpense.noDataExplanation,
          suggestions,
          needsMoreInfo: true,
        };
      }
      const biggest = context.biggestExpense;
      const totalExpenses = context.spendByCategory.reduce((acc, row) => acc + row.totalMinor, 0);
      const share = totalExpenses > 0 ? ` (${((biggest.totalMinor / totalExpenses) * 100).toFixed(0)}% de tus gastos)` : "";
      return {
        ...base,
        intent,
        summary: fill(t.biggestExpense.summary, { category: biggest.name }),
        explanation: fill(t.biggestExpense.explanation, { category: biggest.name, amount: m(biggest.totalMinor), share }),
        dataUsed: [`${biggest.name}: ${m(biggest.totalMinor)}`],
        impact: t.biggestExpense.impact,
        nextStep: { text: "Revisa tus gastos", href: "/app/presupuesto" },
        suggestions,
      };
    }

    case "reduce_expenses": {
      if (context.spendByCategory.length === 0) {
        return {
          ...base,
          intent,
          summary: t.reduceExpenses.noDataSummary,
          explanation: t.reduceExpenses.noDataExplanation,
          suggestions,
          needsMoreInfo: true,
        };
      }
      const top = context.spendByCategory.slice(0, 3);
      const topSum = top.reduce((acc, row) => acc + row.totalMinor, 0);
      const pct = 20;
      const saved = Math.round((topSum * pct) / 100);
      return {
        ...base,
        intent,
        summary: t.reduceExpenses.summary,
        explanation: fill(t.reduceExpenses.explanation, {
          top: top.map((row) => `${row.name} (${m(row.totalMinor)})`).join(", "),
          pct: String(pct),
          saved: m(saved),
        }),
        dataUsed: top.map((row) => `${row.name}: ${m(row.totalMinor)}`),
        impact: fill(t.reduceExpenses.impact, { saved: m(saved) }),
        nextStep: { text: "Revisa tu presupuesto", href: "/app/presupuesto" },
        suggestions,
      };
    }

    case "goal_when": {
      if (!context.hasGoals || context.goals.length === 0) {
        return {
          ...base,
          intent,
          summary: t.goalWhen.noGoalsSummary,
          explanation: t.goalWhen.noGoalsExplanation,
          nextStep: { text: "Crea tu primera meta", href: "/app/metas" },
          suggestions,
          needsMoreInfo: true,
        };
      }
      const goal = context.goals[0];
      if (goal.monthsToReachMinor === null) {
        return {
          ...base,
          intent,
          summary: t.goalWhen.cantSummary,
          explanation: fill(t.goalWhen.cantExplanation, { surplus: m(context.surplusMinor) }),
          dataUsed: [`${goal.name}: ${m(goal.currentMinor)} / ${m(goal.targetMinor)}`],
          nextStep: { text: "Ajusta tu meta", href: "/app/metas" },
          suggestions,
        };
      }
      const months = goal.monthsToReachMinor;
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() + months);
      const dateLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
      return {
        ...base,
        intent,
        summary: fill(t.goalWhen.summary, { goal: goal.name, months: String(months) }),
        explanation: fill(t.goalWhen.explanation, {
          goal: goal.name, target: m(goal.targetMinor), current: m(goal.currentMinor),
          surplus: m(context.surplusMinor), months: String(months),
        }) + ` (~${dateLabel})`,
        dataUsed: [`${goal.name}: ${m(goal.currentMinor)} / ${m(goal.targetMinor)}`, `${dict.moneyAI.contextLabels.balance}: ${m(context.surplusMinor)}`],
        nextStep: { text: "Aporta a tu meta", href: "/app/metas" },
        suggestions,
      };
    }

    case "summary": {
      return {
        ...base,
        intent,
        summary: t.summaryIntent.summary,
        explanation: fill(t.summaryIntent.explanation, {
          income: m(context.monthlyIncomeMinor),
          expenses: m(context.monthlyExpensesMinor),
          balance: m(context.surplusMinor),
          netWorth: m(context.netWorthMinor),
        }),
        dataUsed: [
          `${dict.moneyAI.contextLabels.income}: ${m(context.monthlyIncomeMinor)}`,
          `${dict.moneyAI.contextLabels.expenses}: ${m(context.monthlyExpensesMinor)}`,
          `${dict.moneyAI.contextLabels.netWorth}: ${m(context.netWorthMinor)}`,
        ],
        nextStep: { text: "Ve tu ruta financiera", href: "/app/money-path" },
        suggestions,
      };
    }

    default:
      return {
        ...base,
        intent: "unknown",
        summary: t.fallback.summary,
        explanation: t.fallback.explanation,
        suggestions,
        needsMoreInfo: true,
      };
  }
}
