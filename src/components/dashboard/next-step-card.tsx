import Link from "next/link";
import {
  IconArrowRight,
  IconCreditCard,
  IconLandmark,
  IconRoute,
  IconShield,
  IconTrendingUp,
  IconWallet,
  type IconProps,
} from "@/components/icons";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { deriveNextStep, type NextStepKind } from "@/lib/path-preview";
import type { DashboardData } from "@/lib/dashboard";
import type { ComponentType } from "react";

const KIND_ICONS: Record<Exclude<NextStepKind, "incompleto">, ComponentType<IconProps>> = {
  gastos_exceden: IconWallet,
  deudas: IconCreditCard,
  fondo: IconShield,
  invertir: IconTrendingUp,
  patrimonio: IconLandmark,
};

/**
 * Preview del Money Path™: "Tu próximo paso".
 * Derivado de reglas simples sobre los datos reales del usuario.
 * El módulo Deudas alimenta esta tarjeta con la deuda prioritaria.
 */
export function NextStepCard({ data, topDebtName }: { data: DashboardData; topDebtName?: string | null }) {
  const dict = getDictionary();
  const step = deriveNextStep({
    onboardingCompleted: data.onboardingCompleted,
    income: data.incomeMonth.amount,
    expenses: data.expensesMonth.amount,
    hasDebts: data.debtsTotal.hasDebts,
    debtsTotal: data.debtsTotal.amount,
    reserveCurrent: data.emergencyFund.current,
    reserveTarget: data.emergencyFund.target,
    savingsInvestment: data.savingsInvestment,
  });

  if (step.kind === "incompleto") {
    return (
      <section
        aria-labelledby="next-step-title"
        className="rounded-2xl border border-accent-200 bg-accent-100/60 p-6"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500 text-white">
              <IconRoute size={20} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-600">
                {dict.dashboard.sections.nextStep} · {dict.dashboard.nextStep.title}
              </p>
              <p id="next-step-title" className="mt-1 font-display text-base font-semibold text-primary-950">
                {dict.dashboard.nextStep.incomplete}
              </p>
            </div>
          </div>
          <Link
            href={step.href}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-50 shadow-sm transition-colors hover:bg-primary-hover"
          >
            {dict.dashboard.nextStep.incompleteCta}
            <IconArrowRight size={15} />
          </Link>
        </div>
      </section>
    );
  }

  const Icon = KIND_ICONS[step.kind];
  const texts = dict.dashboard.nextStep.steps[step.kind];
  const description =
    step.kind === "deudas"
      ? texts.desc.replace("{amount}", formatMoney(data.debtsTotal.amount, { currency: data.currency }))
      : texts.desc;

  return (
    <section
      aria-labelledby="next-step-title"
      className="rounded-2xl bg-primary-950 p-6 text-primary-50 shadow-elevated"
    >
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-800 text-accent-300">
            <Icon size={20} />
          </span>
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent-300">
              {dict.dashboard.sections.nextStep} · {dict.dashboard.nextStep.title}
            </p>
            <h2 id="next-step-title" className="mt-1 font-display text-lg font-semibold text-background">
              {texts.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-primary-100">{description}</p>
            {step.kind === "deudas" && topDebtName ? (
              <p className="mt-1.5 text-sm font-semibold text-accent-300">
                {(texts as { target?: string }).target?.replace("{name}", topDebtName)}
              </p>
            ) : null}
            <p className="mt-2.5 text-[11px] leading-relaxed text-primary-300">
              {dict.dashboard.nextStep.disclaimer}
            </p>
          </div>
        </div>
        <Link
          href={step.href}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-600"
        >
          {texts.cta}
          <IconArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
