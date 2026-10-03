import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IconChart, IconRoute } from "@/components/icons";
import {
  ExpenseDonut,
  GoalsProgress,
  IncomeVsExpensesChart,
  NetWorthArea,
} from "@/components/dashboard/charts";
import { CustomizeDashboard } from "@/components/dashboard/customize-modal";
import { IndicatorGrid } from "@/components/dashboard/indicators";
import { NextStepCard } from "@/components/dashboard/next-step-card";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { debts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDashboardData, INDICATOR_IDS } from "@/lib/dashboard";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inicio — Money Path",
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Página Inicio: dashboard completo (Etapa 6). */
export default async function InicioPage() {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDashboardData(session.user.id);
  if (!data) redirect("/onboarding");

  // La deuda prioritaria alimenta el preview del Money Path (Etapa 10).
  let topDebtName: string | null = null;
  if (data.debtsTotal.hasDebts && data.debtsTotal.amount > 0) {
    const topRows = await db
      .select({ name: debts.name })
      .from(debts)
      .where(
        and(
          eq(debts.userId, session.user.id),
          eq(debts.currency, data.currency),
          eq(debts.status, "active"),
          isNull(debts.deletedAt),
          sql`${debts.outstandingBalance} > 0`,
        ),
      )
      .orderBy(asc(debts.priority), asc(debts.createdAt))
      .limit(1);
    topDebtName = topRows[0]?.name ?? null;
  }

  const firstName = (session.user.name ?? "").split(" ")[0];
  const monthLabel = capitalize(
    new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(),
    ),
  );

  const goals = data.goalsView.map((goal) => ({
    ...goal,
    name: goal.derived
      ? (dict.dashboard.charts.goalNames[goal.name as keyof typeof dict.dashboard.charts.goalNames] ??
        goal.name)
      : goal.name,
  }));
  const hasDerivedGoals = data.goalsView.some((goal) => goal.derived);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950 sm:text-3xl">
            {dict.dashboard.greeting.replace("{name}", firstName)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {dict.dashboard.subtitle} · {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-muted">
            {dict.dashboard.currencyNote.replace("{currency}", data.currency)}
          </span>
          <CustomizeDashboard indicatorIds={INDICATOR_IDS} visible={data.visibleIndicators} />
        </div>
      </header>

      {/* ── 1. Situación actual ────────────────────────────────────── */}
      <section aria-labelledby="situation-title">
        <h2
          id="situation-title"
          className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint"
        >
          {dict.dashboard.sections.situation}
        </h2>
        <IndicatorGrid data={data} />
      </section>

      {/* ── 2. Progreso (gráficos) ─────────────────────────────────── */}
      <section aria-labelledby="progress-title">
        <h2
          id="progress-title"
          className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-faint"
        >
          {dict.dashboard.sections.progress}
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Ingresos vs gastos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>{dict.dashboard.charts.incomeVsExpenses}</CardTitle>
                <CardDescription>{dict.dashboard.charts.lastMonths}</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2a7982" }} />
                  {dict.dashboard.charts.income}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#c03d36" }} />
                  {dict.dashboard.charts.expenses}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {data.hasMovements ? (
                <IncomeVsExpensesChart series={data.series} />
              ) : (
                <EmptyState
                  icon={<IconChart size={18} />}
                  title={dict.dashboard.charts.emptyMovements}
                />
              )}
            </CardContent>
          </Card>

          {/* Distribución de gastos */}
          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.charts.distribution}</CardTitle>
              <CardDescription>{dict.dashboard.charts.currentMonth}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.expenseDistribution.length > 0 ? (
                <ExpenseDonut slices={data.expenseDistribution} />
              ) : (
                <EmptyState icon={<IconChart size={18} />} title={dict.dashboard.charts.emptyExpenses} />
              )}
            </CardContent>
          </Card>

          {/* Evolución del patrimonio */}
          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.charts.netWorth}</CardTitle>
              <CardDescription>
                {data.netWorthHistory.length <= 1
                  ? dict.dashboard.charts.startingPoint
                  : dict.dashboard.charts.netWorth}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NetWorthArea points={data.netWorthHistory} />
              {data.netWorthHistory.length <= 1 ? (
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  {dict.dashboard.charts.netWorthSingle}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Progreso de metas */}
          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.charts.goals}</CardTitle>
              {hasDerivedGoals ? (
                <CardDescription>{dict.dashboard.charts.derivedNote}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <GoalsProgress goals={goals} />
              ) : (
                <EmptyState icon={<IconRoute size={18} />} title={dict.dashboard.charts.goalsEmpty} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── 3. Próximo paso (Money Path™) ──────────────────────────── */}
      <NextStepCard data={data} topDebtName={topDebtName} />
    </div>
  );
}
