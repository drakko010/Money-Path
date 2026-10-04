"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconInfo,
  IconRoute,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
} from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import {
  simulateExpenseCut,
  type Finding,
  type MoneyPathView,
} from "@/lib/moneypath-shared";

function fmt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/* ── Textos de la ruta según el hallazgo prioritario ─────────────────── */

function useRouteTexts(data: MoneyPathView) {
  const dict = getDictionary();
  const currency = data.currency as CurrencyCode;
  const money = (minor: number) => formatMoney(minor, { currency });
  const p = data.priority;
  const n = p.numbers;
  const plan = data.plan;
  const input = data.input;

  const texts = dict.moneyPath;

  function priorityTexts(): { title: string; desc: string } {
    const f = texts.findings[p.type];
    switch (p.type) {
      case "overspend":
        return { title: f.title, desc: fmt(f.desc, { amount: money(n.overshootMinor ?? 0) }) };
      case "debt": {
        const highRate =
          n.topDebtRate !== null && n.topDebtRate !== undefined
            ? fmt(texts.findings.debt.withHighRate, { name: n.topDebtName ?? "", rate: String(n.topDebtRate) })
            : "";
        return { title: f.title, desc: fmt(f.desc, { amount: money(n.debtsTotalMinor ?? 0), debt: highRate }) };
      }
      case "lowReserve":
        return { title: f.title, desc: fmt(f.desc, { months: (n.reserveMonths ?? 0).toFixed(1) }) };
      case "lowSavings":
        return {
          title: f.title,
          desc: fmt(f.desc, {
            amount: money(n.surplusMinor ?? 0),
            pct: (n.savingsRatePct ?? 0).toFixed(1),
          }),
        };
      case "goalMismatch":
        return {
          title: f.title,
          desc: fmt(f.desc, {
            goal: n.goalName ?? "",
            needed: money(n.goalNeededMinor ?? 0),
            surplus: money(n.surplusMinor ?? 0),
          }),
        };
      case "netWorthGrowing":
        return { title: f.title, desc: fmt(f.desc, { amount: money(n.netWorthVariationMinor ?? 0) }) };
      default:
        return { title: f.title, desc: f.desc };
    }
  }

  function actionText(): string {
    const a = texts.actions;
    switch (p.type) {
      case "overspend":
        return fmt(a.overspend, { amount: money(n.overshootMinor ?? 0) });
      case "debt":
        return fmt(a.debt, { surplus: money(Math.max(0, input.surplusMinor)) });
      case "lowReserve":
        return fmt(a.lowReserve, { surplus: money(plan.monthlyAmountMinor) });
      case "goalMismatch":
        return fmt(a.goalMismatch, { goal: n.goalName ?? "" });
      case "onTrack":
        return fmt(a.onTrack, { surplus: money(Math.max(0, input.surplusMinor)) });
      default:
        return a[p.type];
    }
  }

  function impactText(): string | null {
    const imp = texts.impact;
    switch (p.type) {
      case "lowReserve": {
        if (plan.months === null) return imp.generic;
        return fmt(imp.reserve, {
          amount: money(plan.monthlyAmountMinor),
          target: money(plan.targetMinor ?? input.fundTargetMinor),
          months: String(plan.months),
        });
      }
      case "debt": {
        if (plan.months === null) return imp.generic;
        return fmt(imp.debt, { amount: money(plan.monthlyAmountMinor), months: String(plan.months) });
      }
      case "overspend":
        return fmt(imp.overspend, { amount: money(n.overshootMinor ?? 0) });
      case "lowSavings":
        return fmt(imp.lowSavings, {
          amount: money(n.surplusMinor ?? 0),
          pct: (n.savingsRatePct ?? 0).toFixed(1),
        });
      case "goalMismatch": {
        const needed = n.goalNeededMinor ?? 0;
        const surplus = n.surplusMinor ?? 0;
        return fmt(imp.goalMismatch, {
          goal: n.goalName ?? "",
          needed: money(needed),
          gap: money(Math.max(0, needed - surplus)),
        });
      }
      case "onTrack":
        return fmt(imp.onTrack, { amount: money(Math.max(0, input.surplusMinor)) });
      default:
        return imp.generic;
    }
  }

  const priority = priorityTexts();
  const nextStep = texts.nextSteps[p.type];

  return {
    priorityTitle: priority.title,
    priorityDesc: priority.desc,
    actionText: actionText(),
    impactText: impactText(),
    nextStep,
  };
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function MoneyPathModule({ data }: { data: MoneyPathView }) {
  const dict = getDictionary();
  const currency = data.currency as CurrencyCode;
  const input = data.input;
  const texts = dict.moneyPath;
  const route = useRouteTexts(data);

  // Simulación de recorte de gastos.
  const maxCutPesos = Math.max(0, Math.floor(input.monthlyExpensesMinor / 100));
  const defaultCut = Math.min(500, maxCutPesos);
  const [cutPesos, setCutPesos] = useState(defaultCut);

  const simulation = useMemo(
    () =>
      simulateExpenseCut(
        {
          monthlyIncomeMinor: input.monthlyIncomeMinor,
          monthlyExpensesMinor: input.monthlyExpensesMinor,
          surplusMinor: input.surplusMinor,
          essentialMonthlyMinor: input.essentialMonthlyMinor,
          fundCurrentMinor: input.fundCurrentMinor,
          fundTargetMinor: input.fundTargetMinor,
        },
        cutPesos * 100,
      ),
    [input, cutPesos],
  );

  const money = (minor: number) => formatMoney(minor, { currency });
  const reserveMonths =
    input.essentialMonthlyMinor > 0 ? input.fundCurrentMinor / input.essentialMonthlyMinor : 0;

  const situationItems: Array<{ label: string; value: React.ReactNode }> = [
    { label: texts.situation.income, value: <MoneyValue amount={input.monthlyIncomeMinor} kind="income" currency={currency} /> },
    { label: texts.situation.expenses, value: <MoneyValue amount={input.monthlyExpensesMinor} kind="expense" currency={currency} /> },
    {
      label: texts.situation.balance,
      value: <MoneyValue amount={input.surplusMinor} kind={input.surplusMinor >= 0 ? "income" : "expense"} currency={currency} />,
    },
    {
      label: texts.situation.debts,
      value:
        input.debtsTotalMinor > 0 ? (
          <MoneyValue amount={input.debtsTotalMinor} kind="debt" currency={currency} />
        ) : (
          <span className="text-sm font-bold text-success">—</span>
        ),
    },
    {
      label: texts.situation.fund,
      value: (
        <span className="flex flex-col items-end">
          <MoneyValue amount={input.fundCurrentMinor} kind="goal" currency={currency} />
          <span className="text-[10px] text-faint">{texts.situation.fundMonths.replace("{months}", reserveMonths.toFixed(1))}</span>
        </span>
      ),
    },
    { label: texts.situation.savings, value: <MoneyValue amount={input.savingsMinor} kind="investment" currency={currency} /> },
    { label: texts.situation.netWorth, value: <MoneyValue amount={input.netWorthMinor} kind="equity" currency={currency} /> },
  ];

  const prioritySeverityBadge =
    data.priority.severity === "high" ? (
      <Badge tone="danger" dot>
        {texts.severity.high}
      </Badge>
    ) : data.priority.severity === "medium" ? (
      <Badge tone="warning" dot>
        {texts.severity.medium}
      </Badge>
    ) : (
      <Badge tone="success" dot>
        {texts.severity.positive}
      </Badge>
    );

  return (
    <div className="flex flex-col gap-6">
      {!input.hasActualData ? <Alert variant="info" title={texts.onboardingOnlyNote} /> : null}

      {/* 1 · Situación actual */}
      <section aria-label={texts.sections.situation}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">{texts.sections.situation}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {situationItems.map((item) => (
            <Card key={item.label} className="p-3.5">
              <p className="text-[11px] font-bold text-muted">{item.label}</p>
              <div className="mt-1">{item.value}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* 2 · Prioridad */}
      <section aria-label={texts.sections.priority}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">{texts.sections.priority}</h2>
        <Card className="border-primary/30">
          <CardContent className="flex items-start gap-4 pt-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
              {data.priority.severity === "positive" ? <IconTrendingUp size={20} /> : <IconTarget size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-primary-950">{route.priorityTitle}</h3>
                {prioritySeverityBadge}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{route.priorityDesc}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3 · Acción recomendada */}
        <section aria-label={texts.sections.action}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">{texts.sections.action}</h2>
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <IconSparkles size={18} className="mt-0.5 shrink-0 text-accent-500" />
              <p className="text-sm leading-relaxed text-text">{route.actionText}</p>
            </CardContent>
          </Card>
        </section>

        {/* 4 · Impacto estimado */}
        <section aria-label={texts.sections.impact}>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-faint">
            {texts.sections.impact}
            <Badge tone="primary">{texts.estimateBadge}</Badge>
          </h2>
          <Card className="bg-primary-soft/30">
            <CardContent className="pt-5">
              <p className="text-sm font-semibold leading-relaxed text-primary-900">
                {route.impactText ?? texts.impact.generic}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 5 · Próximo paso */}
      <section aria-label={texts.sections.nextStep}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">{texts.sections.nextStep}</h2>
        <Link
          href={route.nextStep.href}
          className="group flex items-center justify-between gap-3 rounded-2xl bg-primary-950 px-5 py-4 text-primary-50 shadow-elevated transition-colors hover:bg-primary-900"
        >
          <span className="flex items-center gap-3">
            <IconRoute size={20} className="shrink-0 text-accent-300" />
            <span className="text-sm font-semibold">{route.nextStep.text}</span>
          </span>
          <IconArrowRight size={18} className="shrink-0 text-accent-300 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* Simulación */}
      <section aria-label={texts.simulation.title}>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">{texts.simulation.title}</h2>
        <Card>
          <CardHeader>
            <CardDescription>{texts.simulation.desc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {input.fundTargetMinor > 0 ? (
              <>
                <Slider
                  label={texts.simulation.cutLabel}
                  value={cutPesos}
                  min={0}
                  max={Math.max(100, maxCutPesos)}
                  step={50}
                  showValue
                  formatValue={(value) => money(value * 100)}
                  onValueChange={setCutPesos}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background/60 px-3.5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{texts.simulation.newSurplus}</p>
                    <p className="mt-1 font-display text-lg font-bold tabular-nums text-primary-900">
                      {money(simulation.newSurplusMinor)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 px-3.5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{texts.simulation.fundBefore}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-text">
                      {simulation.fundMonthsBefore === null
                        ? texts.simulation.never
                        : simulation.fundMonthsBefore === 0
                          ? texts.simulation.already
                          : texts.simulation.monthsValue.replace("{months}", String(simulation.fundMonthsBefore))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3.5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{texts.simulation.fundAfter}</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-primary-900">
                      {simulation.fundMonthsAfter === null
                        ? texts.simulation.never
                        : simulation.fundMonthsAfter === 0
                          ? texts.simulation.already
                          : texts.simulation.monthsValue.replace("{months}", String(simulation.fundMonthsAfter))}
                    </p>
                  </div>
                </div>
                {simulation.fundMonthsSaved !== null && simulation.fundMonthsSaved > 0 ? (
                  <Alert variant="success" title={texts.simulation.savedMonths.replace("{months}", String(simulation.fundMonthsSaved))} />
                ) : null}
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
                {texts.simulation.noTarget}
              </p>
            )}
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
              <IconInfo size={13} className="mt-0.5 shrink-0 text-accent-500" />
              {texts.simulation.disclaimer}
            </p>
          </CardContent>
        </Card>
      </section>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <IconAlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
        {texts.disclaimer}
      </p>
    </div>
  );
}
