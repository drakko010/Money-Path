import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { IconArrowRight, IconRoute } from "@/components/icons";
import { RecurringManager, type RecurringView } from "@/components/presupuesto/recurring-manager";
import type { CurrencyCode } from "@/config/locales";
import { db } from "@/db";
import {
  expenseCategories,
  financialProfiles,
  incomeCategories,
  recurringTransactions,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { ensureOccurrences, isRecurringFrequency } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recurrencias — Money Path",
};

export default async function RecurrenciasPage() {
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

  // Generación idempotente de ocurrencias (sin duplicados).
  await ensureOccurrences(userId);

  const rows = await db
    .select({
      id: recurringTransactions.id,
      kind: recurringTransactions.kind,
      description: recurringTransactions.description,
      amount: recurringTransactions.amount,
      frequency: recurringTransactions.frequency,
      startDate: recurringTransactions.startDate,
      endDate: recurringTransactions.endDate,
      nextOccurrence: recurringTransactions.nextOccurrence,
      status: recurringTransactions.status,
      incomeCategoryId: recurringTransactions.incomeCategoryId,
      expenseCategoryId: recurringTransactions.expenseCategoryId,
      incomeCategory: { name: incomeCategories.name },
      expenseCategory: { name: expenseCategories.name },
    })
    .from(recurringTransactions)
    .leftJoin(incomeCategories, eq(recurringTransactions.incomeCategoryId, incomeCategories.id))
    .leftJoin(expenseCategories, eq(recurringTransactions.expenseCategoryId, expenseCategories.id))
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        isNull(recurringTransactions.deletedAt),
      ),
    )
    .orderBy(asc(recurringTransactions.createdAt));

  const templates: RecurringView[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind as "income" | "expense",
    description: row.description,
    amountMinor: Math.round(Number(row.amount ?? "0") * 100),
    frequency: isRecurringFrequency(row.frequency) ? row.frequency : "monthly",
    startDate: String(row.startDate),
    endDate: row.endDate ? String(row.endDate) : null,
    nextOccurrence: String(row.nextOccurrence),
    status: row.status,
    categoryId: row.kind === "income" ? row.incomeCategoryId : row.expenseCategoryId,
    categoryName: row.kind === "income" ? (row.incomeCategory?.name ?? null) : (row.expenseCategory?.name ?? null),
  }));

  const [incomeCats, expenseCats] = await Promise.all([
    db
      .select({ id: incomeCategories.id, name: incomeCategories.name })
      .from(incomeCategories)
      .where(and(eq(incomeCategories.userId, userId), isNull(incomeCategories.deletedAt))),
    db
      .select({ id: expenseCategories.id, name: expenseCategories.name })
      .from(expenseCategories)
      .where(and(eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
            <IconRoute size={20} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary-950">
              {dict.recurring.pageTitle}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              {dict.recurring.pageDescription}
            </p>
          </div>
        </div>
        <Link
          href="/app/presupuesto"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-3 text-xs font-bold text-text shadow-sm transition-colors hover:bg-elevated"
        >
          {dict.recurring.back}
          <IconArrowRight size={13} />
        </Link>
      </header>

      <RecurringManager
        templates={templates}
        currency={currency}
        categories={{ income: incomeCats, expense: expenseCats }}
      />
    </div>
  );
}
