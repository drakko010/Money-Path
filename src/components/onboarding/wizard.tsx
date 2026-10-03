"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  IconArrowRight,
  IconCheck,
  IconCreditCard,
  IconLandmark,
  IconPlane,
  IconRoute,
  IconShield,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconWallet,
  type IconProps,
} from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { MoneyValue } from "@/components/ui/money-value";
import {
  CURRENCIES,
  getCurrencyConfig,
  isCurrencyCode,
  type CurrencyCode,
} from "@/config/locales";
import {
  getDefaultCurrencyForCountry,
  INCOME_FREQUENCIES,
  ONBOARDING_COUNTRIES,
  ONBOARDING_GOALS,
  type IncomeFrequency,
  type OnboardingGoal,
} from "@/config/onboarding";
import { getDictionary } from "@/lib/i18n";
import { formatMoney, toMinorUnits, type MinorUnits } from "@/lib/money";
import type { OnboardingInitial } from "@/lib/onboarding";

const STEP_IDS = [
  "country",
  "currency",
  "income",
  "frequency",
  "expenses",
  "debts",
  "reserve",
  "investments",
  "netWorth",
  "goal",
] as const;

type StepId = (typeof STEP_IDS)[number];

interface WizardState {
  country: string;
  currency: CurrencyCode;
  monthlyIncome: string;
  incomeFrequency: IncomeFrequency;
  essentialExpenses: string;
  hasDebts: boolean | null;
  totalDebts: string;
  currentReserve: string;
  currentInvestments: string;
  approximateNetWorth: string;
  primaryGoal: OnboardingGoal | null;
}

const GOAL_ICONS: Record<OnboardingGoal, ComponentType<IconProps>> = {
  salir_deudas: IconCreditCard,
  crear_reserva: IconShield,
  ahorrar: IconWallet,
  comprar_algo: IconTarget,
  viajar: IconPlane,
  invertir: IconTrendingUp,
  patrimonio: IconLandmark,
  otro: IconSparkles,
};

type AmountCheck =
  | { ok: true; minor: MinorUnits }
  | { ok: false; reason: "empty" | "invalid" | "negative" };

function checkAmount(text: string, currency: CurrencyCode, allowNegative = false): AmountCheck {
  if (text.trim() === "") return { ok: false, reason: "empty" };
  try {
    const minor = toMinorUnits(text, currency);
    if (minor < 0 && !allowNegative) return { ok: false, reason: "negative" };
    return { ok: true, minor };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/* ── Peças de UI ─────────────────────────────────────────────────────── */

function StepHeading({ title, desc, badge }: { title: string; desc: string; badge?: string }) {
  return (
    <header>
      {badge ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-600">
          {badge}
        </p>
      ) : null}
      <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-primary-950 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
    </header>
  );
}

interface OptionDef {
  id: string;
  label: string;
  desc?: string;
  icon?: ComponentType<IconProps>;
}

function OptionsGrid({
  options,
  value,
  onChange,
  columns = "sm:grid-cols-2",
}: {
  options: OptionDef[];
  value: string | null;
  onChange: (id: string) => void;
  columns?: string;
}) {
  return (
    <div role="radiogroup" className={`grid grid-cols-1 gap-2 ${columns}`}>
      {options.map((option) => {
        const active = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
              active
                ? "border-primary bg-primary-soft shadow-sm"
                : "border-border bg-surface hover:border-primary-300"
            }`}
          >
            {Icon ? (
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-primary text-primary-50" : "bg-background text-primary-700"
                }`}
              >
                <Icon size={17} />
              </span>
            ) : null}
            <span className="min-w-0">
              <span
                className={`block truncate text-sm font-bold ${active ? "text-primary-800" : "text-text"}`}
              >
                {option.label}
              </span>
              {option.desc ? (
                <span className="block truncate text-xs text-faint">{option.desc}</span>
              ) : null}
            </span>
            {active ? <IconCheck size={15} className="ml-auto shrink-0 text-primary-700" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function AmountField({
  value,
  onChange,
  currency,
  placeholder,
  error,
  hint,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyCode;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const config = getCurrencyConfig(currency);
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        iconLeft={<span className="text-sm font-bold text-primary-700">{config.symbol}</span>}
        error={error}
        hint={hint}
        autoFocus={autoFocus}
        className="w-full"
      />
      {value && !error ? (
        <p className="font-display text-lg font-semibold tabular-nums text-primary-800">
          {(() => {
            const checked = checkAmount(value, currency, true);
            return checked.ok ? formatMoney(checked.minor, { currency }) : "—";
          })()}
        </p>
      ) : null}
    </div>
  );
}

/* ── Wizard principal ────────────────────────────────────────────────── */

export function OnboardingWizard({
  initial,
  userName,
}: {
  initial: OnboardingInitial;
  userName: string;
}) {
  const dict = getDictionary();
  const [state, setState] = useState<WizardState>({
    country: initial.country,
    currency: isCurrencyCode(initial.currency) ? initial.currency : "MXN",
    monthlyIncome: initial.monthlyIncome,
    incomeFrequency: initial.incomeFrequency,
    essentialExpenses: initial.essentialExpenses,
    hasDebts: initial.hasDebts,
    totalDebts: initial.totalDebts,
    currentReserve: initial.currentReserve,
    currentInvestments: initial.currentInvestments,
    approximateNetWorth: initial.approximateNetWorth,
    primaryGoal: initial.primaryGoal,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const step = STEP_IDS[stepIndex];
  const total = STEP_IDS.length;

  // Pasos cuyo error se muestra dentro del campo de monto.
  const errorShownInField =
    Boolean(error) &&
    (step === "income" ||
      step === "expenses" ||
      step === "reserve" ||
      step === "investments" ||
      step === "netWorth" ||
      (step === "debts" && state.hasDebts === true));

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function selectCountry(id: string) {
    const suggested = getDefaultCurrencyForCountry(id);
    setState((current) => ({
      ...current,
      country: id,
      currency: suggested ?? current.currency,
    }));
    setError(null);
  }

  function amountError(reason: "empty" | "invalid" | "negative"): string {
    if (reason === "negative") return dict.onboarding.negativeAmount;
    if (reason === "empty") return dict.onboarding.required;
    return dict.onboarding.invalidAmount;
  }

  function validateCurrentStep(): boolean {
    const currency = state.currency;
    switch (step) {
      case "income": {
        const check = checkAmount(state.monthlyIncome, currency);
        if (!check.ok) {
          setError(check.reason === "empty" ? dict.onboarding.required : amountError(check.reason));
          return false;
        }
        return true;
      }
      case "expenses": {
        const check = checkAmount(state.essentialExpenses, currency);
        if (!check.ok) {
          setError(check.reason === "empty" ? dict.onboarding.required : amountError(check.reason));
          return false;
        }
        return true;
      }
      case "debts": {
        if (state.hasDebts === null) {
          setError(dict.onboarding.required);
          return false;
        }
        if (state.hasDebts) {
          const check = checkAmount(state.totalDebts, currency);
          if (!check.ok || check.minor <= 0) {
            setError(check.ok ? dict.onboarding.invalidAmount : amountError(check.reason));
            return false;
          }
        }
        return true;
      }
      case "reserve":
      case "investments": {
        const text = step === "reserve" ? state.currentReserve : state.currentInvestments;
        if (text.trim() !== "") {
          const check = checkAmount(text, currency);
          if (!check.ok) {
            setError(amountError(check.reason));
            return false;
          }
        }
        return true;
      }
      case "netWorth": {
        if (state.approximateNetWorth.trim() !== "") {
          const check = checkAmount(state.approximateNetWorth, currency, true);
          if (!check.ok) {
            setError(amountError(check.reason));
            return false;
          }
        }
        return true;
      }
      case "goal": {
        if (!state.primaryGoal) {
          setError(dict.onboarding.required);
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: state.country,
          currency: state.currency,
          monthlyIncome: state.monthlyIncome,
          incomeFrequency: state.incomeFrequency,
          essentialExpenses: state.essentialExpenses,
          hasDebts: state.hasDebts === true,
          totalDebts: state.hasDebts ? state.totalDebts : "",
          currentReserve: state.currentReserve,
          currentInvestments: state.currentInvestments,
          approximateNetWorth: state.approximateNetWorth,
          primaryGoal: state.primaryGoal,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setSubmitError(payload?.message ?? dict.onboarding.serverError);
        setSubmitting(false);
        return;
      }
      setFinished(true);
    } catch {
      setSubmitError(dict.onboarding.serverError);
      setSubmitting(false);
    }
  }

  function next() {
    if (!validateCurrentStep()) return;
    if (stepIndex === total - 1) {
      void submit();
      return;
    }
    setError(null);
    setStepIndex((index) => index + 1);
  }

  function back() {
    setError(null);
    setStepIndex((index) => Math.max(0, index - 1));
  }

  const stepContent = useMemo(
    () => renderStep(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, step, dict],
  );

  function renderStep(): ReactNode {
    const s = dict.onboarding.steps;
    switch (step) {
      case "country":
        return (
          <>
            <StepHeading title={s.country.title} desc={s.country.desc} />
            <div className="mt-5">
              <OptionsGrid
                options={ONBOARDING_COUNTRIES.map((entry) => ({
                  id: entry.id,
                  label: dict.onboarding.countries[entry.id] ?? entry.id,
                }))}
                value={state.country}
                onChange={selectCountry}
              />
            </div>
          </>
        );
      case "currency":
        return (
          <>
            <StepHeading title={s.currency.title} desc={s.currency.desc} />
            <div className="mt-5">
              <Select
                value={state.currency}
                onChange={(event) => update("currency", event.target.value as CurrencyCode)}
              >
                {Object.values(CURRENCIES).map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.code} — {entry.label}
                  </option>
                ))}
              </Select>
            </div>
          </>
        );
      case "income":
        return (
          <>
            <StepHeading title={s.income.title} desc={s.income.desc} />
            <div className="mt-5">
              <AmountField
                value={state.monthlyIncome}
                onChange={(value) => update("monthlyIncome", value)}
                currency={state.currency}
                placeholder={s.income.placeholder}
                error={error ?? undefined}
                autoFocus
              />
            </div>
          </>
        );
      case "frequency":
        return (
          <>
            <StepHeading title={s.frequency.title} desc={s.frequency.desc} />
            <div className="mt-5">
              <OptionsGrid
                options={INCOME_FREQUENCIES.map((id) => ({
                  id,
                  label: dict.onboarding.frequencies[id] ?? id,
                }))}
                value={state.incomeFrequency}
                onChange={(id) => update("incomeFrequency", id as IncomeFrequency)}
              />
            </div>
          </>
        );
      case "expenses":
        return (
          <>
            <StepHeading title={s.expenses.title} desc={s.expenses.desc} />
            <div className="mt-5">
              <AmountField
                value={state.essentialExpenses}
                onChange={(value) => update("essentialExpenses", value)}
                currency={state.currency}
                placeholder={s.expenses.placeholder}
                error={error ?? undefined}
                autoFocus
              />
            </div>
          </>
        );
      case "debts":
        return (
          <>
            <StepHeading title={s.debts.title} desc={s.debts.desc} />
            <div className="mt-5 flex flex-col gap-4">
              <OptionsGrid
                options={[
                  { id: "yes", label: s.debts.yes, icon: IconCreditCard },
                  { id: "no", label: s.debts.no, icon: IconCheck },
                ]}
                value={state.hasDebts === null ? null : state.hasDebts ? "yes" : "no"}
                onChange={(id) => update("hasDebts", id === "yes")}
              />
              {state.hasDebts ? (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-text">{s.debts.amountLabel}</p>
                  <AmountField
                    value={state.totalDebts}
                    onChange={(value) => update("totalDebts", value)}
                    currency={state.currency}
                    placeholder={s.debts.amountPlaceholder}
                    error={error ?? undefined}
                  />
                </div>
              ) : null}
            </div>
          </>
        );
      case "reserve":
        return (
          <>
            <StepHeading title={s.reserve.title} desc={s.reserve.desc} badge={dict.onboarding.optional} />
            <div className="mt-5">
              <AmountField
                value={state.currentReserve}
                onChange={(value) => update("currentReserve", value)}
                currency={state.currency}
                placeholder={s.reserve.placeholder}
                error={error ?? undefined}
                autoFocus
              />
            </div>
          </>
        );
      case "investments":
        return (
          <>
            <StepHeading
              title={s.investments.title}
              desc={s.investments.desc}
              badge={dict.onboarding.optional}
            />
            <div className="mt-5">
              <AmountField
                value={state.currentInvestments}
                onChange={(value) => update("currentInvestments", value)}
                currency={state.currency}
                placeholder={s.investments.placeholder}
                error={error ?? undefined}
                autoFocus
              />
            </div>
          </>
        );
      case "netWorth":
        return (
          <>
            <StepHeading
              title={s.netWorth.title}
              desc={s.netWorth.desc}
              badge={dict.onboarding.optional}
            />
            <div className="mt-5">
              <AmountField
                value={state.approximateNetWorth}
                onChange={(value) => update("approximateNetWorth", value)}
                currency={state.currency}
                placeholder={s.netWorth.placeholder}
                error={error ?? undefined}
                autoFocus
              />
            </div>
          </>
        );
      case "goal":
        return (
          <>
            <StepHeading title={s.goal.title} desc={s.goal.desc} />
            <div className="mt-5">
              <OptionsGrid
                options={ONBOARDING_GOALS.map((goal) => {
                  const GoalIcon = GOAL_ICONS[goal];
                  return {
                    id: goal,
                    label: dict.onboarding.goals[goal].label,
                    desc: dict.onboarding.goals[goal].desc,
                    icon: GoalIcon,
                  };
                })}
                value={state.primaryGoal}
                onChange={(id) => update("primaryGoal", id as OnboardingGoal)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  }

  /* ── Resultado: primera visión + primer estado del Money Path ─────── */

  if (finished) {
    return (
      <ResultView state={state} userName={userName} onRestart={() => setFinished(false)} />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Money Path">
            <Wordmark />
          </Link>
          <span className="text-xs font-bold text-faint">
            {dict.onboarding.progress
              .replace("{step}", String(stepIndex + 1))
              .replace("{total}", String(total))}
          </span>
        </div>
        <div className="mx-auto max-w-2xl px-5 pb-4">
          <Progress value={((stepIndex + 1) / total) * 100} size="sm" />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-8 sm:items-center">
        <div className="w-full max-w-lg">
          {initial.completed && stepIndex === 0 ? (
            <Alert variant="info" title={dict.onboarding.alreadyCompleted} className="mb-4" />
          ) : null}

          <Card variant="elevated" className="p-6 sm:p-8">
            <div key={step} className="animate-fade-in">
              {stepContent}
              {error && !errorShownInField ? (
                <p className="mt-3 text-xs font-semibold text-danger">{error}</p>
              ) : null}
              {submitError ? (
                <Alert variant="danger" title={submitError} className="mt-4" />
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              {stepIndex > 0 ? (
                <Button variant="ghost" onClick={back} disabled={submitting}>
                  {dict.onboarding.back}
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={next} loading={submitting} iconRight={<IconArrowRight size={15} />}>
                {stepIndex === total - 1 ? dict.onboarding.finish : dict.onboarding.next}
              </Button>
            </div>
          </Card>

          <p className="mt-4 text-center text-xs leading-relaxed text-faint">
            {dict.onboarding.subtitle}
          </p>
        </div>
      </main>
    </div>
  );
}

/* ── Vista de resultado ──────────────────────────────────────────────── */

function ResultView({
  state,
  userName,
  onRestart,
}: {
  state: WizardState;
  userName: string;
  onRestart: () => void;
}) {
  const dict = getDictionary();
  const r = dict.onboarding.result;
  const currency = state.currency;

  const minor = (text: string, allowNegative = false): MinorUnits => {
    const checked = checkAmount(text, currency, allowNegative);
    return checked.ok ? checked.minor : 0;
  };

  const income = minor(state.monthlyIncome);
  const expenses = minor(state.essentialExpenses);
  const balance = income - expenses;
  const debts = state.hasDebts ? minor(state.totalDebts) : 0;
  const reserve = minor(state.currentReserve);
  const investments = minor(state.currentInvestments);
  const netWorth = minor(state.approximateNetWorth, true);
  const goal = state.primaryGoal;

  const rows: Array<{ label: string; node: ReactNode }> = [
    { label: r.incomeLabel, node: <MoneyValue amount={income} kind="income" size="lg" /> },
    { label: r.expensesLabel, node: <MoneyValue amount={expenses} kind="expense" size="lg" /> },
    {
      label: r.balanceLabel,
      node: (
        <MoneyValue amount={balance} kind={balance < 0 ? "expense" : "income"} size="lg" />
      ),
    },
    ...(state.hasDebts
      ? [{ label: r.debtsLabel, node: <MoneyValue amount={debts} kind="debt" size="lg" /> }]
      : []),
    { label: r.reserveLabel, node: <MoneyValue amount={reserve} kind="goal" size="lg" /> },
    {
      label: r.investmentsLabel,
      node: <MoneyValue amount={investments} kind="investment" size="lg" />,
    },
    { label: r.netWorthLabel, node: <MoneyValue amount={netWorth} kind="equity" size="lg" /> },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Money Path">
            <Wordmark />
          </Link>
          <Link
            href="/app"
            className="text-xs font-bold text-primary-700 hover:text-primary-hover"
          >
            {r.goToApp}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="animate-scale-in">
          <Badge tone="success" dot className="mb-4">
            {r.firstStateSaved}
          </Badge>
          <h1 className="font-display text-[clamp(1.6rem,4vw,2.4rem)] font-bold leading-tight tracking-tight text-primary-950">
            {r.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {r.intro.replace("{name}", userName.split(" ")[0])}
          </p>
          {goal ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-faint">{r.goalLabel}:</span>
              <Badge tone="primary" dot>
                {dict.onboarding.goals[goal].label}
              </Badge>
            </div>
          ) : null}
        </div>

        <Card variant="elevated" className="mt-8">
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <span className="text-sm font-semibold text-text">{row.label}</span>
                {row.node}
              </li>
            ))}
          </ul>
        </Card>

        <Alert
          variant={balance > 0 ? "success" : balance < 0 ? "warning" : "info"}
          title={
            balance > 0 ? r.balancePositive : balance < 0 ? r.balanceNegative : r.balanceZero
          }
          className="mt-4"
        />
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-faint">
          <IconRoute size={14} className="mt-0.5 shrink-0 text-accent-500" />
          {r.disclaimer}
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-50 shadow-sm transition-colors hover:bg-primary-hover"
          >
            {r.goToApp}
            <IconArrowRight size={15} />
          </Link>
          <Button variant="secondary" size="lg" onClick={onRestart}>
            {r.updateAnswers}
          </Button>
        </div>
      </main>
    </div>
  );
}
