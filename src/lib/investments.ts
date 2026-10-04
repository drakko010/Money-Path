/**
 * Inversiones (Etapa 13) — SOLO SERVIDOR.
 * Sin integración de corretoras/bancos y sin recomendaciones de compra/venta:
 * solo registro y seguimiento de la información del usuario.
 */

import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  financialProfiles,
  investmentAccounts,
  investments,
  investmentTransactions,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { MinorUnits } from "./money";

export function minorOf(value: string | number | null | undefined): MinorUnits {
  if (value === null || value === undefined) return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

export function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export interface InvestmentView {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  averagePriceMinor: MinorUnits | null;
  investedMinor: MinorUnits;
  currentMinor: MinorUnits;
  gainMinor: MinorUnits;
  gainPercent: number | null;
  startDate: string | null;
  accountId: string | null;
  accountName: string | null;
  status: string;
  contributionsCount: number;
  contributionsMinor: MinorUnits;
}

export interface AccountView {
  id: string;
  institution: string;
  name: string;
  accountType: string;
  currency: string;
  balanceMinor: MinorUnits;
  investmentsCount: number;
}

export interface EvolutionPoint {
  /** "YYYY-MM" */
  month: string;
  investedMinor: MinorUnits;
}

export interface InvestmentsData {
  currency: CurrencyCode;
  investments: InvestmentView[];
  accounts: AccountView[];
  evolution: EvolutionPoint[];
  summary: {
    totalInvestedMinor: MinorUnits;
    totalCurrentMinor: MinorUnits;
    totalGainMinor: MinorUnits;
    gainPercent: number | null;
    totalContributionsMinor: MinorUnits;
    contributionsCount: number;
  };
}

/** Meses cubiertos por el gráfico de evolución. */
const EVOLUTION_MONTHS = 12;

export async function getInvestmentsData(userId: string): Promise<InvestmentsData | null> {
  const profileRows = await db
    .select({
      baseCurrency: financialProfiles.baseCurrency,
      onboardingCompletedAt: financialProfiles.onboardingCompletedAt,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;
  const currency = profile.baseCurrency as CurrencyCode;

  const [accountRows, investmentRows] = await Promise.all([
    db
      .select()
      .from(investmentAccounts)
      .where(and(eq(investmentAccounts.userId, userId), isNull(investmentAccounts.deletedAt)))
      .orderBy(asc(investmentAccounts.createdAt)),
    db
      .select()
      .from(investments)
      .where(and(eq(investments.userId, userId), isNull(investments.deletedAt)))
      .orderBy(asc(investments.createdAt)),
  ]);

  const investmentIds = investmentRows.map((row) => row.id);
  const transactions =
    investmentIds.length > 0
      ? await db
          .select({
            investmentId: investmentTransactions.investmentId,
            kind: investmentTransactions.kind,
            amount: investmentTransactions.amount,
            occurredOn: investmentTransactions.occurredOn,
          })
          .from(investmentTransactions)
          .where(
            and(
              eq(investmentTransactions.userId, userId),
              isNull(investmentTransactions.deletedAt),
              sql`${investmentTransactions.investmentId} IN (${sql.join(
                investmentIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
          .orderBy(asc(investmentTransactions.occurredOn))
      : [];

  const transactionsByInvestment = new Map<
    string,
    { kind: string; amount: MinorUnits; date: string }[]
  >();
  for (const transaction of transactions) {
    const list = transactionsByInvestment.get(transaction.investmentId) ?? [];
    list.push({
      kind: transaction.kind,
      amount: minorOf(transaction.amount),
      date: String(transaction.occurredOn),
    });
    transactionsByInvestment.set(transaction.investmentId, list);
  }

  const accountNameById = new Map(accountRows.map((account) => [account.id, account.name]));

  // Solo se considera la moneda base para los totales (no se mezclan monedas).
  const activeInvestments = investmentRows.filter(
    (row) => row.status === "active" && row.currency === currency,
  );

  const views: InvestmentView[] = activeInvestments.map((row) => {
    const investedMinor = minorOf(row.investedAmount);
    const currentMinor = row.currentValue === null ? investedMinor : minorOf(row.currentValue);
    const gainMinor = currentMinor - investedMinor;
    const gainPercent = investedMinor > 0 ? (gainMinor / investedMinor) * 100 : null;
    const contributions = (transactionsByInvestment.get(row.id) ?? []).filter(
      (transaction) => transaction.kind === "contribution",
    );

    return {
      id: row.id,
      name: row.name,
      category: row.instrumentType,
      quantity: row.quantity === null ? null : Number(row.quantity),
      averagePriceMinor: row.averagePrice === null ? null : minorOf(row.averagePrice),
      investedMinor,
      currentMinor,
      gainMinor,
      gainPercent,
      startDate: row.startDate ? String(row.startDate) : null,
      accountId: row.accountId,
      accountName: row.accountId ? (accountNameById.get(row.accountId) ?? null) : null,
      status: row.status,
      contributionsCount: contributions.length,
      contributionsMinor: contributions.reduce((acc, contribution) => acc + contribution.amount, 0),
    };
  });

  const totalInvestedMinor = views.reduce((acc, view) => acc + view.investedMinor, 0);
  const totalCurrentMinor = views.reduce((acc, view) => acc + view.currentMinor, 0);
  const totalGainMinor = totalCurrentMinor - totalInvestedMinor;
  const totalContributionsMinor = views.reduce((acc, view) => acc + view.contributionsMinor, 0);
  const contributionsCount = views.reduce((acc, view) => acc + view.contributionsCount, 0);

  // Evolución: acumulado mensual de aportes (12 meses) + base invertida.
  const evolution = buildEvolution(views, transactions, currency);

  const accounts: AccountView[] = accountRows.map((account) => ({
    id: account.id,
    institution: account.institution,
    name: account.name,
    accountType: account.accountType,
    currency: account.currency,
    balanceMinor: minorOf(account.balance),
    investmentsCount: investmentRows.filter((investment) => investment.accountId === account.id).length,
  }));

  return {
    currency,
    investments: views,
    accounts,
    evolution,
    summary: {
      totalInvestedMinor,
      totalCurrentMinor,
      totalGainMinor,
      gainPercent: totalInvestedMinor > 0 ? (totalGainMinor / totalInvestedMinor) * 100 : null,
      totalContributionsMinor,
      contributionsCount,
    },
  };
}

function buildEvolution(
  views: InvestmentView[],
  transactions: { investmentId: string; kind: string; amount: string | number; occurredOn: unknown }[],
  currency: CurrencyCode,
): EvolutionPoint[] {
  const now = new Date();
  const months: string[] = [];
  for (let offset = EVOLUTION_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  void currency;

  // Base: lo invertido que no proviene de aportes registrados en la ventana.
  const contributionTotal = transactions
    .filter((transaction) => transaction.kind === "contribution")
    .reduce((acc, transaction) => acc + minorOf(transaction.amount), 0);
  const totalInvested = views.reduce((acc, view) => acc + view.investedMinor, 0);
  const base = Math.max(0, totalInvested - contributionTotal);

  const byMonth = new Map<string, MinorUnits>();
  for (const transaction of transactions) {
    if (transaction.kind !== "contribution") continue;
    const month = String(transaction.occurredOn).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + minorOf(transaction.amount));
  }

  let running = base;
  return months.map((month) => {
    running += byMonth.get(month) ?? 0;
    return { month, investedMinor: running };
  });
}

/** Registra un aporte y actualiza el importe invertido. */
export async function registerInvestmentContribution(
  userId: string,
  investmentId: string,
  amountMinor: MinorUnits,
  currency: CurrencyCode,
  note: string | null,
): Promise<{ ok: boolean }> {
  const rows = await db
    .select({ id: investments.id, investedAmount: investments.investedAmount })
    .from(investments)
    .where(and(eq(investments.id, investmentId), eq(investments.userId, userId), isNull(investments.deletedAt)))
    .limit(1);
  const investment = rows[0];
  if (!investment) return { ok: false };

  await db.insert(investmentTransactions).values({
    userId,
    investmentId,
    kind: "contribution",
    amount: decimal(amountMinor),
    currency,
    occurredOn: new Date().toISOString().slice(0, 10),
    note,
  });

  const newInvested = minorOf(investment.investedAmount) + amountMinor;
  await db
    .update(investments)
    .set({ investedAmount: decimal(newInvested) })
    .where(eq(investments.id, investmentId));

  return { ok: true };
}
