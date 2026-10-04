import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emergencyFunds, expenseCategories, financialProfiles } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import {
  computeEssentialMonthly,
  decimal,
  getOrCreateFund,
  minorOf,
  syncFundTarget,
} from "@/lib/fondo";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Fondo de Emergencia (Etapa 11):
 * - `configure`: meses objetivo + ajuste manual del gasto esencial.
 * - `toggleCategory`: marca/desmarca una categoría como esencial.
 * - `contribute`: suma un aporte al valor actual.
 * - `setCurrent`: fija el valor actual directamente.
 */
export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) return fail(dict.auth.errors.generic, 401);
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(dict.fondo.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) return fail(dict.fondo.errors.generic, 404);
  const currency = profileRows[0].baseCurrency as CurrencyCode;
  const op = body.op;

  /* ── configure ──────────────────────────────────────────────────── */
  if (op === "configure") {
    const months = Number(body.targetMonths);
    if (!Number.isFinite(months) || months < 1 || months > 36) {
      return fail(dict.fondo.errors.months);
    }

    let overrideMinor: MinorUnits | null = null;
    if (body.useOverride === true) {
      let parsed: MinorUnits;
      try {
        parsed = toMinorUnits(
          typeof body.essentialOverride === "string" ? body.essentialOverride : "",
          currency,
        );
      } catch {
        return fail(dict.fondo.errors.override);
      }
      if (parsed <= 0) return fail(dict.fondo.errors.override);
      overrideMinor = parsed;
    }

    await db
      .update(financialProfiles)
      .set({
        emergencyFundTargetMonths: String(months),
        essentialMonthlyOverride: overrideMinor === null ? null : decimal(overrideMinor),
      })
      .where(eq(financialProfiles.userId, userId));

    // Sincroniza el objetivo del fondo con el nuevo cálculo.
    const essential = await computeEssentialMonthly(userId, currency);
    const fund = await getOrCreateFund(userId, currency);
    await syncFundTarget(fund.id, essential.minor * months, months, fund.currentMinor);

    return NextResponse.json({ ok: true });
  }

  /* ── toggleCategory ─────────────────────────────────────────────── */
  if (op === "toggleCategory") {
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
    const isEssential = body.isEssential === true;
    if (!categoryId) return fail(dict.fondo.errors.generic);

    const owner = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(
        and(eq(expenseCategories.id, categoryId), eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)),
      )
      .limit(1);
    if (owner.length === 0) return fail(dict.fondo.errors.category, 404);

    await db
      .update(expenseCategories)
      .set({ isEssential })
      .where(eq(expenseCategories.id, categoryId));

    // Recalcula y sincroniza el objetivo del fondo.
    const months = Number(
      (await db.select({ m: financialProfiles.emergencyFundTargetMonths })
        .from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1))[0]?.m ?? 6,
    );
    const essential = await computeEssentialMonthly(userId, currency);
    const fund = await getOrCreateFund(userId, currency);
    await syncFundTarget(fund.id, essential.minor * Math.max(1, months), Math.max(1, months), fund.currentMinor);

    return NextResponse.json({ ok: true });
  }

  /* ── contribute / setCurrent ────────────────────────────────────── */
  if (op === "contribute" || op === "setCurrent") {
    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(typeof body.amount === "string" ? body.amount : "", currency);
    } catch {
      return fail(dict.fondo.errors.amount);
    }
    if (amountMinor < 0) return fail(dict.fondo.errors.amount);

    const fund = await getOrCreateFund(userId, currency);
    const newCurrent = op === "contribute" ? fund.currentMinor + amountMinor : amountMinor;

    await db
      .update(emergencyFunds)
      .set({
        currentAmount: decimal(newCurrent),
        lastContributionOn: new Date().toISOString().slice(0, 10),
      })
      .where(eq(emergencyFunds.id, fund.id));

    return NextResponse.json({ ok: true, current: newCurrent });
  }

  return fail(dict.fondo.errors.generic);
}
