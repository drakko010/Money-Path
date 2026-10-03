/**
 * Módulo Deudas (Etapa 10) — SOLO SERVIDOR.
 * Consultas y mutaciones siempre por el usuario de la sesión.
 */

import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { debtPayments, debts, financialProfiles } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import type { DebtKind, DebtPriority } from "./debts-shared";
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

/* ── Fechas de vencimiento ───────────────────────────────────────────── */

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Próximo vencimiento (dia del mes `dueDay`, con clamp de fin de mes). */
export function nextDueDate(dueDay: number | null, today = new Date()): string | null {
  if (!dueDay) return null;
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = Math.min(dueDay, daysInMonth(year, month));
  const thisMonth = new Date(Date.UTC(year, month, day));
  const todayMidnight = new Date(Date.UTC(year, month, today.getUTCDate()));
  if (thisMonth.getTime() >= todayMidnight.getTime()) {
    return isoDate(thisMonth);
  }
  const nextMonthDay = Math.min(dueDay, daysInMonth(year, month + 1));
  return isoDate(new Date(Date.UTC(year, month + 1, nextMonthDay)));
}

export function daysUntil(iso: string, today = new Date()): number {
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((target - now) / 86400000);
}

/* ── Vista del módulo ────────────────────────────────────────────────── */

export interface DebtView {
  id: string;
  name: string;
  creditor: string | null;
  kind: DebtKind;
  initialMinor: MinorUnits;
  balanceMinor: MinorUnits;
  annualRate: number;
  minimumMinor: MinorUnits;
  dueDay: number | null;
  nextDue: string | null;
  daysUntilDue: number | null;
  totalInstallments: number | null;
  priority: DebtPriority;
  status: string;
}

export interface DebtsSummary {
  totalMinor: MinorUnits;
  remainingMinor: MinorUnits;
  monthPaymentsMinor: MinorUnits;
  monthPaymentsCount: number;
  progressPercent: number;
}

export interface DebtAlert {
  debtId: string;
  name: string;
  dueDate: string;
  days: number;
}

export interface DebtsData {
  currency: CurrencyCode;
  debts: DebtView[];
  summary: DebtsSummary;
  alerts: DebtAlert[];
  /** Excedente mensual estimado del diagnóstico (para la simulación). */
  monthlySurplusMinor: MinorUnits;
}

export const DUE_ALERT_DAYS = 7;

export async function getDebtsData(userId: string): Promise<DebtsData | null> {
  const profileRows = await db
    .select({
      baseCurrency: financialProfiles.baseCurrency,
      monthlyIncome: financialProfiles.monthlyIncome,
      monthlyFixedExpenses: financialProfiles.monthlyFixedExpenses,
      onboardingCompletedAt: financialProfiles.onboardingCompletedAt,
    })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || !profile.onboardingCompletedAt) return null;

  const currency = profile.baseCurrency as CurrencyCode;
  const today = new Date();
  const monthStart = `${today.toISOString().slice(0, 7)}-01`;

  const [debtRows, paymentRows] = await Promise.all([
    db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.currency, currency),
          isNull(debts.deletedAt),
          sql`${debts.status} != 'cancelled'`,
        ),
      )
      .orderBy(debts.priority, debts.createdAt),
    db
      .select({ amount: debtPayments.amount, paidOn: debtPayments.paidOn })
      .from(debtPayments)
      .where(
        and(
          eq(debtPayments.userId, userId),
          eq(debtPayments.currency, currency),
          isNull(debtPayments.deletedAt),
          gte(debtPayments.paidOn, monthStart),
        ),
      ),
  ]);

  const views: DebtView[] = debtRows.map((row) => {
    const dueDay = row.dueDay ?? null;
    const nextDue =
      row.status === "active" || row.status === "defaulted" ? nextDueDate(dueDay, today) : null;
    return {
      id: row.id,
      name: row.name,
      creditor: row.creditor,
      kind: row.kind as DebtKind,
      initialMinor: minorOf(row.initialAmount),
      balanceMinor: minorOf(row.outstandingBalance),
      annualRate: Number(row.annualInterestRate ?? "0") || 0,
      minimumMinor: minorOf(row.minimumPayment),
      dueDay,
      nextDue,
      daysUntilDue: nextDue ? daysUntil(nextDue, today) : null,
      totalInstallments: row.totalInstallments,
      priority: (row.priority as DebtPriority) ?? 2,
      status: row.status,
    };
  });

  const open = views.filter((view) => view.status === "active" || view.status === "defaulted");
  const totalMinor = open.reduce((acc, view) => acc + view.initialMinor, 0);
  const remainingMinor = open.reduce((acc, view) => acc + view.balanceMinor, 0);
  const monthPaymentsMinor = paymentRows.reduce((acc, row) => acc + minorOf(row.amount), 0);
  const progressPercent =
    totalMinor > 0 ? Math.min(100, Math.round(((totalMinor - remainingMinor) / totalMinor) * 100)) : 0;

  const alerts: DebtAlert[] = open
    .filter((view) => view.nextDue && view.daysUntilDue !== null && view.daysUntilDue <= DUE_ALERT_DAYS)
    .map((view) => ({
      debtId: view.id,
      name: view.name,
      dueDate: view.nextDue as string,
      days: view.daysUntilDue as number,
    }))
    .sort((a, b) => a.days - b.days);

  const monthlySurplusMinor = Math.max(
    0,
    minorOf(profile.monthlyIncome) - minorOf(profile.monthlyFixedExpenses),
  );

  return {
    currency,
    debts: views,
    summary: {
      totalMinor,
      remainingMinor,
      monthPaymentsMinor,
      monthPaymentsCount: paymentRows.length,
      progressPercent,
    },
    alerts,
    monthlySurplusMinor,
  };
}
