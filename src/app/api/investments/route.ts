import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  financialProfiles,
  investmentAccounts,
  investments,
  investmentTransactions,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { isCurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import { decimal, registerInvestmentContribution } from "@/lib/investments";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ACCOUNT_TYPES = ["brokerage", "bank", "afore", "crypto", "other"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];
const INVESTMENT_CATEGORIES = ["cetes", "fund", "etf", "stock", "bond", "crypto", "other"] as const;
type InvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number];

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function parseMoney(text: unknown, currency: CurrencyCode): MinorUnits | null {
  if (typeof text !== "string" || text.trim() === "") return null;
  try {
    return toMinorUnits(text.trim(), currency);
  } catch {
    return null;
  }
}

/**
 * Inversiones (Etapa 13): cuentas, inversiones y aportes.
 * Sin integración de corretoras/bancos y sin recomendaciones.
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
    return fail(dict.investmentsModule.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) return fail(dict.investmentsModule.errors.generic, 404);
  const baseCurrency = profileRows[0].baseCurrency as CurrencyCode;
  const op = body.op;

  /* ── createAccount ──────────────────────────────────────────────── */
  if (op === "createAccount") {
    const institution = typeof body.institution === "string" ? body.institution.trim() : "";
    if (!institution || institution.length > 120) return fail(dict.investmentsModule.errors.institution);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.investmentsModule.errors.accountName);

    const accountType: AccountType =
      typeof body.accountType === "string" && (ACCOUNT_TYPES as readonly string[]).includes(body.accountType)
        ? (body.accountType as AccountType)
        : "other";

    const currency =
      typeof body.currency === "string" && isCurrencyCode(body.currency) ? body.currency : baseCurrency;

    const balanceMinor = parseMoney(body.balance, currency) ?? 0;
    if (balanceMinor < 0) return fail(dict.investmentsModule.errors.generic);

    await db.insert(investmentAccounts).values({
      userId,
      institution,
      name,
      accountType,
      currency,
      balance: decimal(balanceMinor),
      openedOn: new Date().toISOString().slice(0, 10),
      status: "active",
    });

    return NextResponse.json({ ok: true });
  }

  /* ── createInvestment ───────────────────────────────────────────── */
  if (op === "createInvestment") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.investmentsModule.errors.name);

    const category: InvestmentCategory =
      typeof body.category === "string" &&
      (INVESTMENT_CATEGORIES as readonly string[]).includes(body.category)
        ? (body.category as InvestmentCategory)
        : "other";

    // Cantidad y precio promedio (opcionales) definen el importe invertido.
    let quantity: number | null = null;
    if (typeof body.quantity === "string" && body.quantity.trim() !== "") {
      const parsed = Number(body.quantity.replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed <= 0) return fail(dict.investmentsModule.errors.quantity);
      quantity = parsed;
    }

    let averagePriceMinor: MinorUnits | null = null;
    if (typeof body.avgPrice === "string" && body.avgPrice.trim() !== "") {
      averagePriceMinor = parseMoney(body.avgPrice, baseCurrency);
      if (averagePriceMinor === null || averagePriceMinor <= 0) {
        return fail(dict.investmentsModule.errors.avgPrice);
      }
    }

    let investedMinor: MinorUnits;
    if (quantity !== null && averagePriceMinor !== null) {
      investedMinor = Math.round(quantity * averagePriceMinor);
    } else {
      const explicit = parseMoney(body.invested, baseCurrency);
      if (explicit === null || explicit <= 0) return fail(dict.investmentsModule.errors.invested);
      investedMinor = explicit;
    }
    if (investedMinor <= 0) return fail(dict.investmentsModule.errors.invested);

    let currentMinor: MinorUnits | null = null;
    if (typeof body.current === "string" && body.current.trim() !== "") {
      currentMinor = parseMoney(body.current, baseCurrency);
      if (currentMinor === null || currentMinor < 0) return fail(dict.investmentsModule.errors.current);
    }

    const startDate =
      typeof body.startDate === "string" && DATE_PATTERN.test(body.startDate)
        ? body.startDate
        : new Date().toISOString().slice(0, 10);

    let accountId: string | null = null;
    if (typeof body.accountId === "string" && body.accountId) {
      const owner = await db
        .select({ id: investmentAccounts.id })
        .from(investmentAccounts)
        .where(
          and(
            eq(investmentAccounts.id, body.accountId),
            eq(investmentAccounts.userId, userId),
            isNull(investmentAccounts.deletedAt),
          ),
        )
        .limit(1);
      if (owner.length > 0) accountId = body.accountId;
    }

    await db.insert(investments).values({
      userId,
      accountId,
      name,
      instrumentType: category,
      investedAmount: decimal(investedMinor),
      currency: baseCurrency,
      currentValue: currentMinor === null ? null : decimal(currentMinor),
      quantity: quantity === null ? null : String(quantity),
      averagePrice: averagePriceMinor === null ? null : decimal(averagePriceMinor),
      startDate,
      status: "active",
    });

    return NextResponse.json({ ok: true });
  }

  /* ── operaciones sobre registros existentes ─────────────────────── */
  if (op === "contribute") {
    const id = typeof body.id === "string" ? body.id : "";
    const amountMinor = parseMoney(body.amount, baseCurrency);
    if (!id || amountMinor === null || amountMinor <= 0) {
      return fail(dict.investmentsModule.errors.amount);
    }
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;
    const result = await registerInvestmentContribution(userId, id, amountMinor, baseCurrency, note);
    if (!result.ok) return fail(dict.investmentsModule.errors.notFound, 404);
    return NextResponse.json({ ok: true });
  }

  if (op === "deleteInvestment" || op === "deleteAccount") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return fail(dict.investmentsModule.errors.generic);

    if (op === "deleteInvestment") {
      const owner = await db
        .select({ id: investments.id })
        .from(investments)
        .where(and(eq(investments.id, id), eq(investments.userId, userId), isNull(investments.deletedAt)))
        .limit(1);
      if (owner.length === 0) return fail(dict.investmentsModule.errors.notFound, 404);
      await db
        .update(investments)
        .set({ deletedAt: new Date(), status: "cancelled" })
        .where(eq(investments.id, id));
      await db
        .update(investmentTransactions)
        .set({ deletedAt: new Date() })
        .where(eq(investmentTransactions.investmentId, id));
      return NextResponse.json({ ok: true });
    }

    const owner = await db
      .select({ id: investmentAccounts.id })
      .from(investmentAccounts)
      .where(
        and(eq(investmentAccounts.id, id), eq(investmentAccounts.userId, userId), isNull(investmentAccounts.deletedAt)),
      )
      .limit(1);
    if (owner.length === 0) return fail(dict.investmentsModule.errors.notFound, 404);
    await db
      .update(investmentAccounts)
      .set({ deletedAt: new Date(), status: "closed" })
      .where(eq(investmentAccounts.id, id));
    // Desvincula las inversiones de la cuenta eliminada.
    await db
      .update(investments)
      .set({ accountId: null })
      .where(and(eq(investments.accountId, id), eq(investments.userId, userId)));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.investmentsModule.errors.generic);
}
