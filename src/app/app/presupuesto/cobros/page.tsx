import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { IconArrowRight, IconCalendar } from "@/components/icons";
import { FutureReceiptsClient, type ReceiptView } from "@/components/presupuesto/future-receipts-client";
import type { CurrencyCode } from "@/config/locales";
import { db } from "@/db";
import { financialProfiles, futureReceipts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { ensureOccurrences } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cobros futuros — Money Path",
};

export default async function CobrosPage() {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) redirect("/onboarding");
  const currency = profileRows[0].baseCurrency as CurrencyCode;

  // Las recurrencias de ingreso generan sus cobros futuros aquí.
  await ensureOccurrences(userId);

  const rows = await db
    .select()
    .from(futureReceipts)
    .where(
      and(
        eq(futureReceipts.userId, userId),
        eq(futureReceipts.currency, currency),
        isNull(futureReceipts.deletedAt),
        sql`${futureReceipts.status} != 'cancelled'`,
      ),
    )
    .orderBy(asc(futureReceipts.expectedOn))
    .limit(200);

  const toView = (row: (typeof rows)[number]): ReceiptView => ({
    id: row.id,
    description: row.description,
    counterparty: row.counterparty,
    amountMinor: Math.round(Number(row.amount ?? "0") * 100),
    expectedOn: String(row.expectedOn),
    receivedOn: row.updatedAt ? row.updatedAt.toISOString().slice(0, 10) : null,
    status: row.status,
    isRecurring: Boolean(row.recurringId),
  });

  const pending = rows.filter((row) => row.status === "pending").map(toView);
  const received = rows
    .filter((row) => row.status === "received")
    .sort((a, b) => Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0))
    .slice(0, 10)
    .map(toView);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
            <IconCalendar size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
              {dict.futureReceipts.pageTitle}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {dict.futureReceipts.pageDescription}
            </p>
          </div>
        </div>
        <Link
          href="/app/presupuesto"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 text-xs font-bold text-text shadow-sm transition-colors hover:bg-elevated"
        >
          {dict.futureReceipts.back}
          <IconArrowRight size={13} />
        </Link>
      </header>

      <FutureReceiptsClient pending={pending} received={received} currency={currency} />
    </div>
  );
}
