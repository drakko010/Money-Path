import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { PresupuestoClient } from "@/components/presupuesto/presupuesto-client";
import { Card } from "@/components/ui/card";
import { MoneyValue } from "@/components/ui/money-value";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getPresupuestoData, TAB_IDS, type PresupuestoTab } from "@/lib/presupuesto";
import { ensureInstallmentOccurrences } from "@/lib/installments";
import { ensureOccurrences } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Presupuesto — Money Path",
};

/** Faixa de resumo do período: Ingresos, Gastos, Ahorro/Inversión, Saldo. */
function SummaryStrip({ data }: { data: NonNullable<Awaited<ReturnType<typeof getPresupuestoData>>> }) {
  const dict = getDictionary();
  const summary = dict.presupuesto.summary;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs font-bold text-muted">{summary.ingresos}</p>
        <MoneyValue
          className="mt-1.5"
          amount={data.summary.incomeReceived}
          kind="income"
          currency={data.currency}
          size="lg"
        />
      </Card>
      <Card className="p-4">
        <p className="text-xs font-bold text-muted">{summary.gastos}</p>
        <MoneyValue
          className="mt-1.5"
          amount={data.summary.expensesCommitted}
          kind="expense"
          currency={data.currency}
          size="lg"
        />
        <p className="mt-1 text-[11px] text-faint">{summary.gastosHint}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-bold text-muted">{summary.ahorro}</p>
        <MoneyValue
          className="mt-1.5"
          amount={data.summary.savings}
          kind="investment"
          currency={data.currency}
          size="lg"
        />
        <p className="mt-1 text-[11px] text-faint">{summary.ahorroHint}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-bold text-muted">{summary.saldo}</p>
        <MoneyValue
          className="mt-1.5"
          amount={data.summary.balance}
          kind={data.summary.balance < 0 ? "expense" : "income"}
          currency={data.currency}
          size="lg"
        />
      </Card>
    </div>
  );
}

/** Abas do módulo (links com parâmetro `tab`, preservando o período). */
function TabLinks({ active, period }: { active: PresupuestoTab; period: string }) {
  const dict = getDictionary();

  return (
    <div role="tablist" aria-label="Pestañas del presupuesto" className="flex gap-1 overflow-x-auto border-b border-border">
      {TAB_IDS.map((tab) => {
        const isActive = tab === active;
        const href = `/app/presupuesto?tab=${tab}${period && period !== "this_month" ? `&p=${period}` : ""}`;
        return (
          <Link
            key={tab}
            role="tab"
            aria-selected={isActive}
            href={href}
            className={`relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? "text-primary-700" : "text-muted hover:text-text"
            }`}
          >
            {dict.presupuesto.tabs[tab]}
            <span
              aria-hidden
              className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors ${
                isActive ? "bg-primary-600" : "bg-transparent"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}

export default async function PresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;

  // Genera ocurrencias recurrentes y cuotas parceladas faltantes (Etapas 8/9).
  await ensureOccurrences(session.user.id);
  await ensureInstallmentOccurrences(session.user.id);

  const data = await getPresupuestoData(session.user.id, {
    tab: single(params.tab),
    p: single(params.p),
    cat: single(params.cat),
    tipo: single(params.tipo),
    estado: single(params.estado),
  });
  if (!data) redirect("/onboarding");

  return (
    <PageShell navId="presupuesto" active>
      <SummaryStrip data={data} />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app/presupuesto/recurrencias"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-soft px-3.5 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100"
        >
          {dict.presupuestoAccess.recurring}
        </Link>
        <Link
          href="/app/presupuesto/cobros"
          className="inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-100 px-3.5 py-1.5 text-xs font-bold text-accent-600 transition-colors hover:bg-accent-200"
        >
          {dict.presupuestoAccess.futureReceipts}
        </Link>
        <Link
          href="/app/presupuesto/parcelas"
          className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-3.5 py-1.5 text-xs font-bold text-danger-strong transition-colors hover:bg-danger/15"
        >
          {dict.presupuestoAccess.installments}
        </Link>
      </div>
      <TabLinks active={data.tab} period={data.filters.period} />
      <PresupuestoClient data={data} />
    </PageShell>
  );
}
