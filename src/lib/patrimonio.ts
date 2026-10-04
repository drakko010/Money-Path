/**
 * Patrimonio (Etapa 14) — SOLO SERVIDOR.
 *
 * Patrimonio neto = Total de activos − Total de pasivos.
 * Cada visita registra/actualiza un snapshot mensual para construir el
 * histórico de evolución. Los totales consideran solo la moneda base
 * (no se mezclan monedas).
 */

import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, financialProfiles, liabilities, netWorthSnapshots } from "@/db/schema";
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

export interface AssetView {
  id: string;
  kind: string;
  name: string;
  valueMinor: MinorUnits;
  acquiredOn: string | null;
  valuationSource: string;
  status: string;
}

export interface LiabilityView {
  id: string;
  kind: string;
  name: string;
  balanceMinor: MinorUnits;
  monthlyPaymentMinor: MinorUnits | null;
  status: string;
}

export interface SnapshotPoint {
  /** "YYYY-MM" */
  month: string;
  netWorthMinor: MinorUnits;
}

export interface PatrimonioData {
  currency: CurrencyCode;
  assets: AssetView[];
  liabilities: LiabilityView[];
  totals: {
    assetsMinor: MinorUnits;
    liabilitiesMinor: MinorUnits;
    netWorthMinor: MinorUnits;
    /** Variación contra el snapshot anterior (null si no hay previo). */
    variationMinor: MinorUnits | null;
    variationPercent: number | null;
  };
  history: SnapshotPoint[];
}

/**
 * Garantiza un snapshot del mes en curso (uno por mes) y devuelve el
 * histórico agrupado por mes.
 */
async function ensureMonthlySnapshot(
  userId: string,
  currency: CurrencyCode,
  assetsMinor: MinorUnits,
  liabilitiesMinor: MinorUnits,
): Promise<void> {
  const netWorthMinor = assetsMinor - liabilitiesMinor;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const monthStart = `${todayIso.slice(0, 7)}-01`;

  const existing = await db
    .select({ id: netWorthSnapshots.id })
    .from(netWorthSnapshots)
    .where(
      and(
        eq(netWorthSnapshots.userId, userId),
        eq(netWorthSnapshots.currency, currency),
        gte(netWorthSnapshots.snapshotDate, monthStart),
      ),
    )
    .orderBy(desc(netWorthSnapshots.snapshotDate))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(netWorthSnapshots)
      .set({
        assetsTotal: decimal(assetsMinor),
        liabilitiesTotal: decimal(liabilitiesMinor),
        netWorth: decimal(netWorthMinor),
        snapshotDate: todayIso,
      })
      .where(eq(netWorthSnapshots.id, existing[0].id));
  } else {
    await db.insert(netWorthSnapshots).values({
      userId,
      snapshotDate: todayIso,
      assetsTotal: decimal(assetsMinor),
      liabilitiesTotal: decimal(liabilitiesMinor),
      netWorth: decimal(netWorthMinor),
      currency,
    });
  }
}

export async function getPatrimonioData(userId: string): Promise<PatrimonioData | null> {
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

  const [assetRows, liabilityRows] = await Promise.all([
    db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          eq(assets.currency, currency),
          eq(assets.status, "active"),
          isNull(assets.deletedAt),
        ),
      )
      .orderBy(asc(assets.createdAt)),
    db
      .select()
      .from(liabilities)
      .where(
        and(
          eq(liabilities.userId, userId),
          eq(liabilities.currency, currency),
          eq(liabilities.status, "active"),
          isNull(liabilities.deletedAt),
        ),
      )
      .orderBy(asc(liabilities.createdAt)),
  ]);

  const assetViews: AssetView[] = assetRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    valueMinor: minorOf(row.estimatedValue),
    acquiredOn: row.acquiredOn ? String(row.acquiredOn) : null,
    valuationSource: row.valuationSource,
    status: row.status,
  }));

  const liabilityViews: LiabilityView[] = liabilityRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    balanceMinor: minorOf(row.outstandingAmount),
    monthlyPaymentMinor: row.monthlyPayment === null ? null : minorOf(row.monthlyPayment),
    status: row.status,
  }));

  const assetsMinor = assetViews.reduce((acc, view) => acc + view.valueMinor, 0);
  const liabilitiesMinor = liabilityViews.reduce((acc, view) => acc + view.balanceMinor, 0);

  // Snapshot del mes + histórico.
  await ensureMonthlySnapshot(userId, currency, assetsMinor, liabilitiesMinor);

  const snapshotRows = await db
    .select({
      snapshotDate: netWorthSnapshots.snapshotDate,
      netWorth: netWorthSnapshots.netWorth,
    })
    .from(netWorthSnapshots)
    .where(and(eq(netWorthSnapshots.userId, userId), eq(netWorthSnapshots.currency, currency)))
    .orderBy(asc(netWorthSnapshots.snapshotDate));

  // Agrupa por mes y conserva el último valor de cada mes.
  const byMonth = new Map<string, MinorUnits>();
  for (const row of snapshotRows) {
    const month = String(row.snapshotDate).slice(0, 7);
    byMonth.set(month, minorOf(row.netWorth));
  }
  const history: SnapshotPoint[] = Array.from(byMonth.entries())
    .map(([month, netWorthMinor]) => ({ month, netWorthMinor }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Variación contra el mes previo.
  let variationMinor: MinorUnits | null = null;
  let variationPercent: number | null = null;
  if (history.length >= 2) {
    const last = history[history.length - 1].netWorthMinor;
    const prev = history[history.length - 2].netWorthMinor;
    variationMinor = last - prev;
    variationPercent = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : null;
  }

  return {
    currency,
    assets: assetViews,
    liabilities: liabilityViews,
    totals: {
      assetsMinor,
      liabilitiesMinor,
      netWorthMinor: assetsMinor - liabilitiesMinor,
      variationMinor,
      variationPercent,
    },
    history,
  };
}
