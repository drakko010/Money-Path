"use client";

import { useState, type ReactNode } from "react";
import { IconInfo, IconRefresh, IconTrendingUp } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney, toMinorUnits } from "@/lib/money";
import {
  buyVsRent,
  compoundInterest,
  firstGoal,
  goalContribution,
} from "@/lib/calculators";

type Errors = Record<string, string>;

/* ── Helpers ─────────────────────────────────────────────────────────── */

function parseMinor(text: string, currency: CurrencyCode): number | null {
  if (text.trim() === "") return null;
  try {
    return toMinorUnits(text.trim(), currency);
  } catch {
    return null;
  }
}

function parseNumber(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function ResultRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      <span className={`tabular-nums ${strong ? "font-display text-lg font-bold text-primary-900" : "text-sm font-semibold text-text"}`}>
        {value}
      </span>
    </div>
  );
}

/* ── 1. Interés compuesto ────────────────────────────────────────────── */

function CompoundCalculator({ currency }: { currency: CurrencyCode }) {
  const dict = getDictionary();
  const c = dict.calculators.compound;
  const [initial, setInitial] = useState("");
  const [contribution, setContribution] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<ReturnType<typeof compoundInterest> | null>(null);

  function calculate() {
    const errs: Errors = {};
    const initialMinor = parseMinor(initial, currency);
    const contributionMinor = contribution.trim() === "" ? 0 : parseMinor(contribution, currency);
    const ratePct = parseNumber(rate);
    const yearsNum = parseNumber(years);

    if (initialMinor === null || initialMinor <= 0) errs.initial = dict.calculators.errors.positive;
    if (contributionMinor === null || contributionMinor < 0) errs.contribution = dict.calculators.errors.positive;
    if (ratePct === null || ratePct < 0 || ratePct > 200) errs.rate = dict.calculators.errors.rate;
    if (yearsNum === null || yearsNum < 1 || yearsNum > 100) errs.years = dict.calculators.errors.years;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setResult(null);
      return;
    }
    setResult(
      compoundInterest({
        initialMinor: initialMinor as number,
        contributionMinor: contributionMinor as number,
        annualRatePct: ratePct as number,
        years: yearsNum as number,
      }),
    );
  }

  function reset() {
    setInitial("");
    setContribution("");
    setRate("");
    setYears("");
    setErrors({});
    setResult(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3.5">
        <Input label={c.initial} hint={c.initialHint} placeholder="10,000.00" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} error={errors.initial} />
        <Input label={c.contribution} hint={c.contributionHint} placeholder="1,500.00" inputMode="decimal" value={contribution} onChange={(e) => setContribution(e.target.value)} error={errors.contribution} />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label={c.rate} hint={c.rateHint} placeholder="10" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.rate} />
          <Input label={c.years} hint={c.yearsHint} placeholder="10" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} error={errors.years} />
        </div>
        <div className="flex gap-2">
          <Button onClick={calculate}>{dict.calculators.actions.calculate}</Button>
          <Button variant="secondary" iconLeft={<IconRefresh size={14} />} onClick={reset}>
            {dict.calculators.actions.reset}
          </Button>
        </div>
      </div>

      <div>
        {result ? (
          <Card className="border-primary/30 bg-primary-soft/30">
            <CardContent className="flex flex-col divide-y divide-border/60 pt-5">
              <ResultRow label={c.results.contributed} value={formatMoney(result.contributedMinor, { currency })} />
              <ResultRow label={c.results.interest} value={`+${formatMoney(result.interestMinor, { currency })}`} />
              <ResultRow label={c.results.final} value={formatMoney(result.finalMinor, { currency })} strong />
            </CardContent>
          </Card>
        ) : (
          <Card className="grid min-h-40 place-items-center border-dashed">
            <p className="px-6 text-center text-xs text-faint">{c.desc}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── 2. Meta financiera ──────────────────────────────────────────────── */

function GoalCalculator({ currency }: { currency: CurrencyCode }) {
  const dict = getDictionary();
  const c = dict.calculators.goal;
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [years, setYears] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<ReturnType<typeof goalContribution> | null>(null);

  function calculate() {
    const errs: Errors = {};
    const targetMinor = parseMinor(target, currency);
    const currentMinor = current.trim() === "" ? 0 : parseMinor(current, currency);
    const yearsNum = parseNumber(years);

    if (targetMinor === null || targetMinor <= 0) errs.target = dict.calculators.errors.target;
    if (currentMinor === null || currentMinor < 0) errs.current = dict.calculators.errors.positive;
    if (yearsNum === null || yearsNum < 1 || yearsNum > 100) errs.years = dict.calculators.errors.years;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setResult(null);
      return;
    }
    setResult(goalContribution({ targetMinor: targetMinor as number, currentMinor: currentMinor as number, years: yearsNum as number }));
  }

  function reset() {
    setTarget("");
    setCurrent("");
    setYears("");
    setErrors({});
    setResult(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3.5">
        <Input label={c.target} hint={c.targetHint} placeholder="50,000.00" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
        <Input label={c.current} hint={c.currentHint} placeholder="5,000.00" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
        <Input label={c.years} hint={c.yearsHint} placeholder="3" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} error={errors.years} />
        <div className="flex gap-2">
          <Button onClick={calculate}>{dict.calculators.actions.calculate}</Button>
          <Button variant="secondary" iconLeft={<IconRefresh size={14} />} onClick={reset}>
            {dict.calculators.actions.reset}
          </Button>
        </div>
      </div>

      <div>
        {result ? (
          <Card className="border-primary/30 bg-primary-soft/30">
            <CardContent className="flex flex-col divide-y divide-border/60 pt-5">
              {result.neededMinor === 0 ? (
                <p className="py-2 text-center text-sm font-semibold text-success-strong">{c.results.reached}</p>
              ) : (
                <>
                  <ResultRow label={c.results.needed} value={`${formatMoney(result.neededMinor, { currency })} ${c.results.months.replace("{months}", String(result.months))}`} />
                  <ResultRow label={c.results.perMonth} value={formatMoney(result.perMonthMinor, { currency })} strong />
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="grid min-h-40 place-items-center border-dashed">
            <p className="px-6 text-center text-xs text-faint">{c.desc}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── 3. Primer gran objetivo ─────────────────────────────────────────── */

function FirstGoalCalculator({ currency }: { currency: CurrencyCode }) {
  const dict = getDictionary();
  const c = dict.calculators.firstGoal;
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [rate, setRate] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<ReturnType<typeof firstGoal> | null>(null);

  function calculate() {
    const errs: Errors = {};
    const targetMinor = parseMinor(target, currency);
    const monthlyMinor = parseMinor(monthly, currency);
    const ratePct = parseNumber(rate);

    if (targetMinor === null || targetMinor <= 0) errs.target = dict.calculators.errors.target;
    if (monthlyMinor === null || monthlyMinor <= 0) errs.monthly = dict.calculators.errors.positive;
    if (ratePct === null || ratePct < 0 || ratePct > 200) errs.rate = dict.calculators.errors.rate;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setResult(null);
      return;
    }
    setResult(firstGoal({ targetMinor: targetMinor as number, monthlyMinor: monthlyMinor as number, annualRatePct: ratePct as number }));
  }

  function reset() {
    setTarget("");
    setMonthly("");
    setRate("");
    setErrors({});
    setResult(null);
  }

  function formatDuration(months: number): string {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years > 0) {
      return dict.calculators.firstGoal.results.yearsMonths.replace("{years}", String(years)).replace("{months}", String(rem));
    }
    return dict.calculators.firstGoal.results.monthsOnly.replace("{months}", String(months));
  }

  const maxBalance = result ? Math.max(...result.perYear.map((row) => row.balanceMinor), 1) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Input label={c.target} hint={c.targetHint} placeholder="250,000.00" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
        <Input label={c.monthly} hint={c.monthlyHint} placeholder="3,000.00" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} error={errors.monthly} />
        <Input label={c.rate} hint={c.rateHint} placeholder="8" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.rate} />
      </div>
      <div className="flex gap-2">
        <Button onClick={calculate}>{dict.calculators.actions.calculate}</Button>
        <Button variant="secondary" iconLeft={<IconRefresh size={14} />} onClick={reset}>
          {dict.calculators.actions.reset}
        </Button>
      </div>

      {result ? (
        <div className="flex flex-col gap-4">
          {result.months === null ? (
            <Alert variant="warning" title={dict.calculators.firstGoal.results.neverReach} />
          ) : (
            <Alert variant="success" title={`${dict.calculators.firstGoal.results.reachIn} ${formatDuration(result.months)}.`} />
          )}
          {result.perYear.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{dict.calculators.firstGoal.results.perYear}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {result.perYear.slice(0, 30).map((row) => (
                  <div key={row.year} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-faint">Año {row.year}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-primary-50">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round((row.balanceMinor / maxBalance) * 100))}%` }}
                      />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs font-semibold tabular-nums text-text">
                      {formatMoney(row.balanceMinor, { currency })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ── 4. Comprar vs rentar ────────────────────────────────────────────── */

function BuyRentCalculator({ currency }: { currency: CurrencyCode }) {
  const dict = getDictionary();
  const c = dict.calculators.buyRent;
  const [years, setYears] = useState("10");
  const [homePrice, setHomePrice] = useState("");
  const [downPayment, setDownPayment] = useState("20");
  const [mortgageRate, setMortgageRate] = useState("");
  const [mortgageYears, setMortgageYears] = useState("20");
  const [maintenance, setMaintenance] = useState("");
  const [appreciation, setAppreciation] = useState("3");
  const [rent, setRent] = useState("");
  const [rentIncrease, setRentIncrease] = useState("5");
  const [investReturn, setInvestReturn] = useState("8");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<ReturnType<typeof buyVsRent> | null>(null);

  function calculate() {
    const errs: Errors = {};
    const yearsNum = parseNumber(years);
    const homePriceMinor = parseMinor(homePrice, currency);
    const downPct = parseNumber(downPayment);
    const mortgageRatePct = parseNumber(mortgageRate);
    const mortgageYearsNum = parseNumber(mortgageYears);
    const maintenanceMinor = maintenance.trim() === "" ? 0 : parseMinor(maintenance, currency);
    const appreciationPct = parseNumber(appreciation);
    const rentMinor = parseMinor(rent, currency);
    const rentIncreasePct = parseNumber(rentIncrease);
    const investReturnPct = parseNumber(investReturn);

    if (yearsNum === null || yearsNum < 1 || yearsNum > 50) errs.years = dict.calculators.errors.years;
    if (homePriceMinor === null || homePriceMinor <= 0) errs.homePrice = dict.calculators.errors.positive;
    if (downPct === null || downPct < 0 || downPct > 100) errs.downPayment = dict.calculators.errors.percent;
    if (mortgageRatePct === null || mortgageRatePct < 0 || mortgageRatePct > 200) errs.mortgageRate = dict.calculators.errors.rate;
    if (mortgageYearsNum === null || mortgageYearsNum < 1 || mortgageYearsNum > 40) errs.mortgageYears = dict.calculators.errors.years;
    if (maintenanceMinor === null || maintenanceMinor < 0) errs.maintenance = dict.calculators.errors.positive;
    if (appreciationPct === null || appreciationPct < 0 || appreciationPct > 50) errs.appreciation = dict.calculators.errors.rate;
    if (rentMinor === null || rentMinor <= 0) errs.rent = dict.calculators.errors.positive;
    if (rentIncreasePct === null || rentIncreasePct < 0 || rentIncreasePct > 50) errs.rentIncrease = dict.calculators.errors.rate;
    if (investReturnPct === null || investReturnPct < 0 || investReturnPct > 200) errs.investReturn = dict.calculators.errors.rate;

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setResult(null);
      return;
    }

    setResult(
      buyVsRent({
        years: yearsNum as number,
        homePriceMinor: homePriceMinor as number,
        downPaymentPct: downPct as number,
        mortgageRatePct: mortgageRatePct as number,
        mortgageYears: mortgageYearsNum as number,
        monthlyMaintenanceMinor: maintenanceMinor as number,
        appreciationPct: appreciationPct as number,
        monthlyRentMinor: rentMinor as number,
        rentIncreasePct: rentIncreasePct as number,
        investReturnPct: investReturnPct as number,
      }),
    );
  }

  function reset() {
    setYears("10");
    setHomePrice("");
    setDownPayment("20");
    setMortgageRate("");
    setMortgageYears("20");
    setMaintenance("");
    setAppreciation("3");
    setRent("");
    setRentIncrease("5");
    setInvestReturn("8");
    setErrors({});
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Input label={c.years} hint={c.yearsHint} placeholder="10" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} error={errors.years} className="max-w-40" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{c.buySection}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            <Input label={c.homePrice} hint={c.homePriceHint} placeholder="2,000,000" inputMode="decimal" value={homePrice} onChange={(e) => setHomePrice(e.target.value)} error={errors.homePrice} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label={c.downPayment} hint={c.downPaymentHint} placeholder="20" inputMode="decimal" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} error={errors.downPayment} />
              <Input label={c.mortgageRate} hint={c.mortgageRateHint} placeholder="11" inputMode="decimal" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} error={errors.mortgageRate} />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label={c.mortgageYears} hint={c.mortgageYearsHint} placeholder="20" inputMode="numeric" value={mortgageYears} onChange={(e) => setMortgageYears(e.target.value)} error={errors.mortgageYears} />
              <Input label={c.maintenance} hint={c.maintenanceHint} placeholder="2,500" inputMode="decimal" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} error={errors.maintenance} />
            </div>
            <Input label={c.appreciation} hint={c.appreciationHint} placeholder="3" inputMode="decimal" value={appreciation} onChange={(e) => setAppreciation(e.target.value)} error={errors.appreciation} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{c.rentSection}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            <Input label={c.rent} hint={c.rentHint} placeholder="12,000" inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} error={errors.rent} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label={c.rentIncrease} hint={c.rentIncreaseHint} placeholder="5" inputMode="decimal" value={rentIncrease} onChange={(e) => setRentIncrease(e.target.value)} error={errors.rentIncrease} />
              <Input label={c.investReturn} hint={c.investReturnHint} placeholder="8" inputMode="decimal" value={investReturn} onChange={(e) => setInvestReturn(e.target.value)} error={errors.investReturn} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={calculate}>{dict.calculators.actions.calculate}</Button>
        <Button variant="secondary" iconLeft={<IconRefresh size={14} />} onClick={reset}>
          {dict.calculators.actions.reset}
        </Button>
      </div>

      {result ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>{c.results.buyCost}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/60">
              <ResultRow label={c.results.monthlyMortgage} value={formatMoney(result.buy.monthlyMortgageMinor, { currency })} />
              <ResultRow label={c.results.equity} value={formatMoney(result.buy.equityMinor, { currency })} />
              <ResultRow label={c.results.buyCost} value={formatMoney(result.buy.netCostMinor, { currency })} strong />
            </CardContent>
          </Card>
          <Card className="border-accent-300">
            <CardHeader>
              <CardTitle>{c.results.rentCost}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/60">
              <ResultRow label={dict.calculators.buyRent.rent} value={formatMoney(result.rent.totalRentMinor, { currency })} />
              <ResultRow label={c.results.rentCost} value={formatMoney(result.rent.netCostMinor, { currency })} strong />
            </CardContent>
          </Card>
          <div className="md:col-span-2">
            <Alert
              variant={result.winner === "buy" ? "success" : "info"}
              title={
                Math.abs(result.differenceMinor) < 100
                  ? dict.calculators.buyRent.results.tie
                  : result.winner === "buy"
                    ? dict.calculators.buyRent.results.winnerBuy.replace("{amount}", formatMoney(Math.abs(result.differenceMinor), { currency }))
                    : dict.calculators.buyRent.results.winnerRent.replace("{amount}", formatMoney(Math.abs(result.differenceMinor), { currency }))
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Módulo ──────────────────────────────────────────────────────────── */

export function CalculatorsModule({ currency }: { currency: CurrencyCode }) {
  const dict = getDictionary();
  const [tab, setTab] = useState("compound");

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="compound">{dict.calculators.tabs.compound}</TabsTrigger>
          <TabsTrigger value="goal">{dict.calculators.tabs.goal}</TabsTrigger>
          <TabsTrigger value="firstGoal">{dict.calculators.tabs.firstGoal}</TabsTrigger>
          <TabsTrigger value="buyRent">{dict.calculators.tabs.buyRent}</TabsTrigger>
        </TabsList>

        <TabsPanel value="compound">
          <CompoundCalculator currency={currency} />
        </TabsPanel>
        <TabsPanel value="goal">
          <GoalCalculator currency={currency} />
        </TabsPanel>
        <TabsPanel value="firstGoal">
          <FirstGoalCalculator currency={currency} />
        </TabsPanel>
        <TabsPanel value="buyRent">
          <BuyRentCalculator currency={currency} />
        </TabsPanel>
      </Tabs>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <IconInfo size={13} className="mt-0.5 shrink-0 text-accent-500" />
        {dict.calculators.disclaimer}
      </p>
    </div>
  );
}
