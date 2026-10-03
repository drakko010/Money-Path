"use client";

import { useMemo, useState } from "react";
import { IconAlertCircle, IconArrowRight, IconTrendingUp } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { MoneyValue } from "@/components/ui/money-value";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import {
  simulateStrategy,
  type StrategyDebtInput,
  type StrategyResult,
} from "@/lib/debts-shared";
import type { DebtView } from "@/lib/debts";

/* ── Orden de prioridad ──────────────────────────────────────────────── */

export function PriorityList({
  debts,
  currency,
}: {
  debts: DebtView[];
  currency: CurrencyCode;
}) {
  const dict = getDictionary();
  const ordered = [...debts]
    .filter((debt) => debt.status === "active" || debt.status === "defaulted")
    .sort((a, b) => a.priority - b.priority || b.balanceMinor - a.balanceMinor);

  if (ordered.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-faint">
        {dict.debtsModule.plan.noDebts}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {ordered.map((debt, index) => (
        <li
          key={debt.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft font-display text-sm font-bold text-primary-800">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-text">{debt.name}</p>
              <Badge tone={debt.priority === 1 ? "danger" : debt.priority === 2 ? "warning" : "neutral"}>
                {dict.debtsModule.priorityLabels[String(debt.priority) as "1" | "2" | "3"]}
              </Badge>
              {debt.status === "defaulted" ? (
                <Badge tone="danger" dot>
                  {dict.debtsModule.statusLabels.defaulted}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-faint">
              {dict.debtsModule.kindLabels[debt.kind]} · {dict.debtsModule.fields.rate}:{" "}
              {debt.annualRate > 0 ? `${debt.annualRate}%` : "—"} ·{" "}
              {dict.debtsModule.fields.minimum}:{" "}
              {debt.minimumMinor > 0 ? formatMoney(debt.minimumMinor, { currency }) : "—"}
            </p>
          </div>
          <MoneyValue amount={debt.balanceMinor} kind="debt" currency={currency} size="lg" />
        </li>
      ))}
    </ol>
  );
}

/* ── Comparación de estrategias ──────────────────────────────────────── */

function StrategyCard({
  title,
  desc,
  result,
  currency,
  recommended,
  recommendedLabel,
  monthsLabel,
  interestLabel,
  totalLabel,
  firstLabel,
  noConvergeLabel,
}: {
  title: string;
  desc: string;
  result: StrategyResult;
  currency: CurrencyCode;
  recommended: boolean;
  recommendedLabel: string;
  monthsLabel: string;
  interestLabel: string;
  totalLabel: string;
  firstLabel: string;
  noConvergeLabel: string;
}) {
  return (
    <Card className={`p-5 ${recommended ? "border-primary bg-primary-soft/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-display text-base font-bold text-primary-950">{title}</h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{desc}</p>
        </div>
        {recommended ? (
          <Badge tone="primary" dot>
            {recommendedLabel}
          </Badge>
        ) : null}
      </div>

      {result.months === null ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-xs font-semibold leading-relaxed text-warning-strong">
          <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
          {noConvergeLabel}
        </p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {monthsLabel}
            </dt>
            <dd className="mt-0.5 font-display text-xl font-bold tabular-nums text-primary-900">
              {result.months}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {interestLabel}
            </dt>
            <dd className="mt-0.5">
              <MoneyValue amount={result.totalInterestMinor} kind="debt" currency={currency} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {totalLabel}
            </dt>
            <dd className="mt-0.5">
              <MoneyValue amount={result.totalPaidMinor} kind="expense" currency={currency} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {firstLabel}
            </dt>
            <dd className="mt-0.5 text-xs font-bold text-text">
              {result.firstPayoff ? (
                <>
                  {result.firstPayoff.name}
                  <span className="ml-1 text-faint">
                    ({result.firstPayoff.month} {monthsLabel})
                  </span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

export function PaymentPlan({
  debts,
  currency,
  surplusMinor,
}: {
  debts: DebtView[];
  currency: CurrencyCode;
  surplusMinor: number;
}) {
  const dict = getDictionary();
  const [extraMinor, setExtraMinor] = useState(surplusMinor);

  const inputs: StrategyDebtInput[] = useMemo(
    () =>
      debts
        .filter((debt) => debt.status === "active" || debt.status === "defaulted")
        .map((debt) => ({
          id: debt.id,
          name: debt.name,
          balanceMinor: debt.balanceMinor,
          annualRate: debt.annualRate,
          minimumMinor: debt.minimumMinor,
        })),
    [debts],
  );

  const avalanche = useMemo(
    () => simulateStrategy(inputs, extraMinor, "avalanche"),
    [inputs, extraMinor],
  );
  const snowball = useMemo(
    () => simulateStrategy(inputs, extraMinor, "snowball"),
    [inputs, extraMinor],
  );

  if (inputs.length === 0) {
    return <PriorityList debts={debts} currency={currency} />;
  }

  const monthsA = avalanche.months;
  const monthsS = snowball.months;
  const avalancheBetter =
    monthsA !== null &&
    monthsS !== null &&
    avalanche.totalInterestMinor < snowball.totalInterestMinor;
  const saved = Math.abs(avalanche.totalInterestMinor - snowball.totalInterestMinor);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={dict.debtsModule.plan.priorityTitle}>
        <h3 className="font-display text-base font-bold text-primary-950">
          {dict.debtsModule.plan.priorityTitle}
        </h3>
        <p className="mt-0.5 text-xs text-muted">{dict.debtsModule.plan.priorityHint}</p>
        <div className="mt-3">
          <PriorityList debts={debts} currency={currency} />
        </div>
      </section>

      <section aria-label={dict.debtsModule.plan.strategyTitle}>
        <h3 className="font-display text-base font-bold text-primary-950">
          {dict.debtsModule.plan.strategyTitle}
        </h3>

        <div className="mt-3 rounded-xl border border-border bg-surface p-4 shadow-card">
          <Slider
            label={dict.debtsModule.plan.extraLabel}
            value={Math.round(extraMinor / 100)}
            min={0}
            max={Math.max(500, Math.round((surplusMinor + 2000000) / 100))}
            step={50}
            showValue
            formatValue={(value) => formatMoney(value * 100, { currency })}
            onValueChange={(value) => setExtraMinor(value * 100)}
          />
          <p className="mt-1.5 text-[11px] text-faint">{dict.debtsModule.plan.extraHint}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <StrategyCard
            title={dict.debtsModule.plan.avalanche.name}
            desc={dict.debtsModule.plan.avalanche.desc}
            result={avalanche}
            currency={currency}
            recommended={avalancheBetter}
            recommendedLabel={dict.debtsModule.plan.winner}
            monthsLabel={dict.debtsModule.plan.months}
            interestLabel={dict.debtsModule.plan.interest}
            totalLabel={dict.debtsModule.plan.totalPaid}
            firstLabel={dict.debtsModule.plan.firstPayoff}
            noConvergeLabel={dict.debtsModule.plan.noConverge}
          />
          <StrategyCard
            title={dict.debtsModule.plan.snowball.name}
            desc={dict.debtsModule.plan.snowball.desc}
            result={snowball}
            currency={currency}
            recommended={!avalancheBetter && monthsA !== null && monthsS !== null && saved > 0}
            recommendedLabel={dict.debtsModule.plan.winner}
            monthsLabel={dict.debtsModule.plan.months}
            interestLabel={dict.debtsModule.plan.interest}
            totalLabel={dict.debtsModule.plan.totalPaid}
            firstLabel={dict.debtsModule.plan.firstPayoff}
            noConvergeLabel={dict.debtsModule.plan.noConverge}
          />
        </div>

        {avalancheBetter && saved > 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-soft p-3.5 text-xs font-semibold leading-relaxed text-success-strong">
            <IconTrendingUp size={14} className="mt-0.5 shrink-0" />
            {dict.debtsModule.plan.recommended
              .replace("{strategy}", dict.debtsModule.plan.avalanche.name)
              .replace("{saved}", formatMoney(saved, { currency }))}
          </p>
        ) : null}

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <IconArrowRight size={12} className="mt-0.5 shrink-0 text-accent-500" />
          {dict.debtsModule.plan.disclaimer}
        </p>
      </section>
    </div>
  );
}
