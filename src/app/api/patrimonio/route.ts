import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assets, financialProfiles, liabilities } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import { decimal } from "@/lib/patrimonio";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ASSET_KINDS = ["cash", "investment", "real_estate", "vehicle", "other"] as const;
type AssetKind = (typeof ASSET_KINDS)[number];
const LIABILITY_KINDS = ["financing", "personal_loan", "credit_card", "other"] as const;
type LiabilityKind = (typeof LIABILITY_KINDS)[number];

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
 * Patrimonio (Etapa 14): activos, pasivos y borrado suave.
 * Los vehículos aceptan valor manual (valuationSource = "manual"); la
 * estructura queda lista para valuación externa futura.
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
    return fail(dict.patrimonioModule.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) return fail(dict.patrimonioModule.errors.generic, 404);
  const currency = profileRows[0].baseCurrency as CurrencyCode;
  const op = body.op;

  /* ── createAsset ────────────────────────────────────────────────── */
  if (op === "createAsset") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.patrimonioModule.errors.name);

    const kind: AssetKind =
      typeof body.kind === "string" && (ASSET_KINDS as readonly string[]).includes(body.kind)
        ? (body.kind as AssetKind)
        : "other";

    const valueMinor = parseMoney(body.value, currency);
    if (valueMinor === null || valueMinor <= 0) return fail(dict.patrimonioModule.errors.value);

    const acquiredOn =
      typeof body.acquiredOn === "string" && DATE_PATTERN.test(body.acquiredOn)
        ? body.acquiredOn
        : null;
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;

    await db.insert(assets).values({
      userId,
      kind,
      name,
      estimatedValue: decimal(valueMinor),
      currency,
      acquiredOn,
      note,
      valuationSource: "manual",
      status: "active",
    });

    return NextResponse.json({ ok: true });
  }

  /* ── createLiability ────────────────────────────────────────────── */
  if (op === "createLiability") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.patrimonioModule.errors.name);

    const kind: LiabilityKind =
      typeof body.kind === "string" && (LIABILITY_KINDS as readonly string[]).includes(body.kind)
        ? (body.kind as LiabilityKind)
        : "other";

    const balanceMinor = parseMoney(body.amount, currency);
    if (balanceMinor === null || balanceMinor < 0) return fail(dict.patrimonioModule.errors.amount);

    let monthlyPaymentMinor: MinorUnits | null = null;
    if (typeof body.monthlyPayment === "string" && body.monthlyPayment.trim() !== "") {
      monthlyPaymentMinor = parseMoney(body.monthlyPayment, currency);
      if (monthlyPaymentMinor === null || monthlyPaymentMinor < 0) {
        return fail(dict.patrimonioModule.errors.monthlyPayment);
      }
    }

    let dueDay: number | null = null;
    if (body.dueDay !== null && body.dueDay !== undefined && String(body.dueDay).trim() !== "") {
      dueDay = Number(body.dueDay);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return fail(dict.patrimonioModule.errors.dueDay);
      }
    }

    await db.insert(liabilities).values({
      userId,
      kind,
      name,
      outstandingAmount: decimal(balanceMinor),
      currency,
      monthlyPayment: monthlyPaymentMinor === null ? null : decimal(monthlyPaymentMinor),
      dueDay,
      status: "active",
    });

    return NextResponse.json({ ok: true });
  }

  /* ── borrado suave ──────────────────────────────────────────────── */
  if (op === "deleteAsset" || op === "deleteLiability") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return fail(dict.patrimonioModule.errors.generic);

    if (op === "deleteAsset") {
      const owner = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(eq(assets.id, id), eq(assets.userId, userId), isNull(assets.deletedAt)))
        .limit(1);
      if (owner.length === 0) return fail(dict.patrimonioModule.errors.notFound, 404);
      await db
        .update(assets)
        .set({ deletedAt: new Date(), status: "removed" })
        .where(eq(assets.id, id));
      return NextResponse.json({ ok: true });
    }

    const owner = await db
      .select({ id: liabilities.id })
      .from(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId), isNull(liabilities.deletedAt)))
      .limit(1);
    if (owner.length === 0) return fail(dict.patrimonioModule.errors.notFound, 404);
    await db
      .update(liabilities)
      .set({ deletedAt: new Date(), status: "removed" })
      .where(eq(liabilities.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.patrimonioModule.errors.generic);
}
