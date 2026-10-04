import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { IconArrowRight, IconCreditCard } from "@/components/icons";
import {
  InstallmentsClient,
  type InstallmentCardView,
} from "@/components/presupuesto/installments-client";
import type { CurrencyCode } from "@/config/locales";
import { db } from "@/db";
import { expenseCategories, financialProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { ensureInstallmentOccurrences, listInstallments } from "@/lib/installments";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compras parceladas — Money Path",
};

export default async function ParcelasPage() {
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

  // Materializa cuotas faltantes antes de mostrar (idempotente).
  await ensureInstallmentOccurrences(userId);

  const views = (await listInstallments(userId)) as InstallmentCardView[];

  const categories = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
            <IconCreditCard size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
              {dict.installments.pageTitle}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {dict.installments.pageDescription}
            </p>
          </div>
        </div>
        <Link
          href="/app/presupuesto"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 text-xs font-bold text-text shadow-sm transition-colors hover:bg-elevated"
        >
          {dict.installments.back}
          <IconArrowRight size={13} />
        </Link>
      </header>

      <InstallmentsClient views={views} currency={currency} categories={categories} />
    </div>
  );
}
