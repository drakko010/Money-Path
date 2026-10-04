import { NextResponse } from "next/server";
import { isCurrencyCode, type CurrencyCode } from "@/config/locales";
import {
  isIncomeFrequency,
  isOnboardingCountry,
  isOnboardingGoal,
} from "@/config/onboarding";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { saveOnboarding, type OnboardingData } from "@/lib/onboarding";
import { toMinorUnits, type MinorUnits } from "@/lib/money";

export const dynamic = "force-dynamic";

interface ParsedAmount {
  minor?: MinorUnits;
  error?: string;
}

/** Parsea un monto enviado por el cliente a centavos (validación servidor). */
function parseAmount(
  value: unknown,
  currency: CurrencyCode,
  options: { required: boolean; allowNegative?: boolean },
  dict: ReturnType<typeof getDictionary>,
): ParsedAmount {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") {
    if (options.required) {
      return { error: dict.onboarding.invalidAmount };
    }
    return { minor: 0 };
  }
  try {
    const minor = toMinorUnits(text, currency);
    if (minor < 0 && !options.allowNegative) {
      return { error: dict.onboarding.negativeAmount };
    }
    return { minor };
  } catch {
    return { error: dict.onboarding.invalidAmount };
  }
}

/**
 * Guarda las respuestas del onboarding.
 * Seguridad: la sesión se resuelve en el servidor; el usuario dueño de los
 * datos es SIEMPRE el de la sesión (nunca un id del cliente).
 */
export async function POST(request: Request) {
  const dict = getDictionary();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: dict.auth.errors.generic }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: dict.onboarding.serverError }, { status: 400 });
  }

  const currencyValue = body.currency;
  if (typeof currencyValue !== "string" || !isCurrencyCode(currencyValue)) {
    return NextResponse.json({ message: dict.onboarding.serverError }, { status: 400 });
  }
  const currency = currencyValue;

  const country = body.country;
  if (typeof country !== "string" || !isOnboardingCountry(country)) {
    return NextResponse.json({ message: dict.onboarding.serverError }, { status: 400 });
  }

  const frequency = body.incomeFrequency;
  if (typeof frequency !== "string" || !isIncomeFrequency(frequency)) {
    return NextResponse.json({ message: dict.onboarding.serverError }, { status: 400 });
  }

  const goal = body.primaryGoal;
  if (typeof goal !== "string" || !isOnboardingGoal(goal)) {
    return NextResponse.json({ message: dict.onboarding.serverError }, { status: 400 });
  }

  const hasDebts = body.hasDebts === true;

  const income = parseAmount(body.monthlyIncome, currency, { required: true }, dict);
  if (income.error || income.minor === undefined) {
    return NextResponse.json({ message: income.error ?? dict.onboarding.serverError }, { status: 400 });
  }

  const expenses = parseAmount(body.essentialExpenses, currency, { required: true }, dict);
  if (expenses.error || expenses.minor === undefined) {
    return NextResponse.json({ message: expenses.error ?? dict.onboarding.serverError }, { status: 400 });
  }

  const debts = parseAmount(
    body.totalDebts,
    currency,
    { required: hasDebts },
    dict,
  );
  if (debts.error || debts.minor === undefined) {
    return NextResponse.json({ message: debts.error ?? dict.onboarding.serverError }, { status: 400 });
  }
  if (hasDebts && debts.minor <= 0) {
    return NextResponse.json({ message: dict.onboarding.invalidAmount }, { status: 400 });
  }

  const reserve = parseAmount(body.currentReserve, currency, { required: false }, dict);
  if (reserve.error || reserve.minor === undefined) {
    return NextResponse.json({ message: reserve.error ?? dict.onboarding.serverError }, { status: 400 });
  }

  const investments = parseAmount(body.currentInvestments, currency, { required: false }, dict);
  if (investments.error || investments.minor === undefined) {
    return NextResponse.json({ message: investments.error ?? dict.onboarding.serverError }, { status: 400 });
  }

  const netWorth = parseAmount(
    body.approximateNetWorth,
    currency,
    { required: false, allowNegative: true },
    dict,
  );
  if (netWorth.error || netWorth.minor === undefined) {
    return NextResponse.json({ message: netWorth.error ?? dict.onboarding.serverError }, { status: 400 });
  }

  const data: OnboardingData = {
    country,
    currency,
    monthlyIncome: income.minor,
    incomeFrequency: frequency,
    essentialExpenses: expenses.minor,
    hasDebts,
    totalDebts: hasDebts ? debts.minor : 0,
    currentReserve: reserve.minor,
    currentInvestments: investments.minor,
    approximateNetWorth: netWorth.minor,
    primaryGoal: goal,
  };

  await saveOnboarding(session.user.id, data);

  return NextResponse.json({ ok: true });
}
