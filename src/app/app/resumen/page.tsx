import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { buildInsights, getReportsData, isReportPeriod, REPORT_PERIODS } from "@/lib/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBars, IncomeExpensesBars, NetWorthLine } from "@/components/reportes/reports-charts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resumen — Money Path",
};

function changeBadge(pct: number | null) {
  if (pct === null) return <span className="text-xs text-faint">—</span>;
  const positive = pct >= 0;
  return (
    <span className={`text-xs font-bold tabular-nums ${positive ? "text-success-strong" : "text-danger-strong"}`}>
      {positive ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const rawPeriod = Number(params.p);
  const period = isReportPeriod(rawPeriod) ? rawPeriod : 3;

  const data = await getReportsData(session.user.id, period);
  if (!data) redirect("/onboarding");

  const dict = getDictionary();
  const currency = data.currency as CurrencyCode;
  const money = (minor: number) => formatMoney(minor, { currency });

  const insights = buildInsights(
    data,
    {
      categoryUp: dict.reports.insights.templates.categoryUp,
      categoryDown: dict.reports.insights.templates.categoryDown,
      savingsUp: dict.reports.insights.templates.savingsUp,
      savingsDown: dict.reports.insights.templates.savingsDown,
      netWorthUp: dict.reports.insights.templates.netWorthUp,
      netWorthDown: dict.reports.insights.templates.netWorthDown,
      debtPaid: dict.reports.insights.templates.debtPaid,
      investmentGain: dict.reports.insights.templates.investmentGain,
      incomeUp: dict.reports.insights.templates.incomeUp,
      incomeDown: dict.reports.insights.templates.incomeDown,
    },
    money,
  );

  const savingsRate = data.totals.incomeMinor > 0 ? (data.totals.savingsMinor / data.totals.incomeMinor) * 100 : 0;
  const avgSavings = data.months.length > 0 ? data.totals.savingsMinor / data.months.length : 0;

  return (
    <PageShell navId="resumen" active>
      <div className="flex flex-col gap-6">
        {/* Selector de período */}
        <div className="flex flex-wrap items-center gap-2">
          {REPORT_PERIODS.map((p) => (
            <Link
              key={p}
              href={`/app/resumen?p=${p}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                p === period
                  ? "border-primary bg-primary text-primary-50"
                  : "border-line bg-surface text-muted hover:border-primary-300 hover:text-primary-700"
              }`}
            >
              {dict.reports.periods[String(p) as keyof typeof dict.reports.periods]}
            </Link>
          ))}
        </div>

        {!data.hasData ? (
          <Card className="grid place-items-center border-dashed py-16">
            <p className="px-6 text-center text-sm text-faint">{dict.reports.noData}</p>
          </Card>
        ) : (
          <>
            {/* Insights */}
            <section aria-label={dict.reports.insights.title}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                {dict.reports.insights.title}
              </h2>
              {insights.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
                  {dict.reports.insights.empty}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                        insight.tone === "positive"
                          ? "border-success/30 bg-success-soft/60"
                          : insight.tone === "warning"
                            ? "border-warning/30 bg-warning-soft/60"
                            : "border-line bg-surface"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          insight.tone === "positive"
                            ? "bg-success"
                            : insight.tone === "warning"
                              ? "bg-warning"
                              : "bg-faint"
                        }`}
                      />
                      <p className="text-sm leading-relaxed text-text">{insight.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Comparación con el período anterior */}
            <section aria-label={dict.reports.comparison.title}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                {dict.reports.comparison.title}
              </h2>
              <Card>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-faint">
                        <th className="py-2 font-semibold">{""}</th>
                        <th className="py-2 text-right font-semibold">{dict.reports.comparison.previous}</th>
                        <th className="py-2 text-right font-semibold">{dict.reports.comparison.current}</th>
                        <th className="py-2 text-right font-semibold">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-line/60">
                        <td className="py-2.5 text-muted">{dict.reports.comparison.income}</td>
                        <td className="py-2.5 text-right tabular-nums text-text">{money(data.totals.prevIncomeMinor)}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-text">{money(data.totals.incomeMinor)}</td>
                        <td className="py-2.5 text-right">{changeBadge(data.totals.incomeChangePct)}</td>
                      </tr>
                      <tr className="border-b border-line/60">
                        <td className="py-2.5 text-muted">{dict.reports.comparison.expenses}</td>
                        <td className="py-2.5 text-right tabular-nums text-text">{money(data.totals.prevExpensesMinor)}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-text">{money(data.totals.expensesMinor)}</td>
                        <td className="py-2.5 text-right">
                          {data.totals.expensesChangePct === null ? (
                            <span className="text-xs text-faint">—</span>
                          ) : (
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                data.totals.expensesChangePct <= 0 ? "text-success-strong" : "text-danger-strong"
                              }`}
                            >
                              {data.totals.expensesChangePct >= 0 ? "▲" : "▼"} {Math.abs(data.totals.expensesChangePct).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-muted">{dict.reports.comparison.savings}</td>
                        <td className="py-2.5 text-right tabular-nums text-text">{money(data.totals.prevSavingsMinor)}</td>
                        <td className="py-2.5 text-right font-semibold tabular-nums text-text">{money(data.totals.savingsMinor)}</td>
                        <td className="py-2.5 text-right">{changeBadge(data.totals.savingsChangePct)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            {/* Evolución ingresos/gastos */}
            <section aria-label={dict.reports.sections.evolution}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint">
                {dict.reports.sections.evolution}
              </h2>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm">{dict.reports.sections.evolution}</CardTitle>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-f-income)" }} />
                      {dict.reports.evolution.income}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--color-f-expense)" }} />
                      {dict.reports.evolution.expenses}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <IncomeExpensesBars months={data.months} currency={currency} />
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Categorías */}
              <section aria-label={dict.reports.sections.categories}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{dict.reports.sections.categories}</CardTitle>
                    <CardDescription>{dict.reports.categories.current}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.categories.length === 0 ? (
                      <p className="py-4 text-center text-xs text-faint">{dict.reports.categories.empty}</p>
                    ) : (
                      <CategoryBars categories={data.categories} currency={currency} labels={dict.reports.categories} />
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Capacidad de ahorro */}
              <section aria-label={dict.reports.sections.savings}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{dict.reports.sections.savings}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.savings.thisPeriod}</span>
                      <span className={`font-display text-lg font-bold tabular-nums ${data.totals.savingsMinor >= 0 ? "text-success-strong" : "text-danger-strong"}`}>
                        {money(data.totals.savingsMinor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.savings.avg}</span>
                      <span className="text-sm font-semibold tabular-nums text-text">{money(Math.round(avgSavings))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.savings.rate}</span>
                      <span className={`text-sm font-bold tabular-nums ${savingsRate >= 0 ? "text-success-strong" : "text-danger-strong"}`}>
                        {savingsRate.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Deudas */}
              <section aria-label={dict.reports.sections.debts}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{dict.reports.sections.debts}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.debts.total}</span>
                      <span className="font-display text-lg font-bold tabular-nums text-f-debt">{money(data.debts.totalMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.debts.active}</span>
                      <span className="text-sm font-semibold tabular-nums text-text">{data.debts.activeCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.debts.paid}</span>
                      <span className="text-sm font-semibold tabular-nums text-success-strong">{money(data.debts.paidInPeriodMinor)}</span>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Inversiones */}
              <section aria-label={dict.reports.sections.investments}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{dict.reports.sections.investments}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.investments.invested}</span>
                      <span className="text-sm font-semibold tabular-nums text-text">{money(data.investments.investedMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.investments.current}</span>
                      <span className="text-sm font-semibold tabular-nums text-text">{money(data.investments.currentMinor)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">{dict.reports.investments.gain}</span>
                      <span className={`text-sm font-bold tabular-nums ${data.investments.gainMinor >= 0 ? "text-success-strong" : "text-danger-strong"}`}>
                        {money(data.investments.gainMinor)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Patrimonio */}
            <section aria-label={dict.reports.sections.netWorth}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{dict.reports.sections.netWorth}</CardTitle>
                    <CardDescription>
                      {dict.reports.netWorth.latest}: {money(data.netWorth.latestMinor)}
                      {data.netWorth.changeMinor !== null
                        ? ` · ${dict.reports.netWorth.change}: ${money(data.netWorth.changeMinor)}`
                        : ""}
                    </CardDescription>
                  </div>
                  {data.netWorth.changeMinor !== null ? (
                    <Badge tone={data.netWorth.changeMinor >= 0 ? "success" : "danger"}>
                      {data.netWorth.changeMinor >= 0 ? "▲" : "▼"}
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {data.netWorth.points.length >= 2 ? (
                    <NetWorthLine points={data.netWorth.points} currency={currency} />
                  ) : (
                    <p className="py-4 text-center text-xs text-faint">{dict.reports.netWorth.empty}</p>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}


