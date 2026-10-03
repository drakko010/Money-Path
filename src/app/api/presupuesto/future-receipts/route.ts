import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { financialProfiles, futureReceipts, income } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import { isValidIsoDate } from "@/lib/recurring";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function decimal(minor: MinorUnits): string {
  const abs = Math.abs(minor);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Cobros futuros (Etapa 8):
 * - `create`: registro manual de un cobro pendiente.
 * - `markReceived`: lo concreta como ingreso recibido (crea el ingreso si no
 *   estaba vinculado); el cobro queda fuera de pendientes.
 * - `cancel`: lo quita de pendientes sin crear ingreso.
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
    return fail(dict.futureReceipts.form.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = (profileRows[0]?.baseCurrency ?? "MXN") as CurrencyCode;
  const op = body.op;

  if (op === "create") {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description || description.length > 200) return fail(dict.futureReceipts.form.errors.description);

    const counterparty =
      typeof body.counterparty === "string" && body.counterparty.trim()
        ? body.counterparty.trim().slice(0, 120)
        : null;

    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(typeof body.amount === "string" ? body.amount : "", currency);
    } catch {
      return fail(dict.futureReceipts.form.errors.amount);
    }
    if (amountMinor <= 0) return fail(dict.futureReceipts.form.errors.amount);

    const expectedOn = typeof body.expectedOn === "string" ? body.expectedOn : "";
    if (!isValidIsoDate(expectedOn)) return fail(dict.futureReceipts.form.errors.date);

    await db.insert(futureReceipts).values({
      userId,
      description,
      counterparty,
      amount: decimal(amountMinor),
      currency,
      expectedOn,
      status: "pending",
    });
    return NextResponse.json({ ok: true });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(dict.futureReceipts.form.errors.generic);

  const rows = await db
    .select()
    .from(futureReceipts)
    .where(
      and(
        eq(futureReceipts.id, id),
        eq(futureReceipts.userId, userId),
        isNull(futureReceipts.deletedAt),
      ),
    )
    .limit(1);
  const receipt = rows[0];
  if (!receipt) return fail(dict.recurring.errors.notFound, 404);

  if (op === "markReceived") {
    if (receipt.receivedIncomeId) {
      await db
        .update(income)
        .set({ status: "received" })
        .where(and(eq(income.id, receipt.receivedIncomeId), eq(income.userId, userId)));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const created = await db
        .insert(income)
        .values({
          userId,
          description: receipt.description,
          amount: receipt.amount,
          currency: receipt.currency,
          occurredOn: today,
          status: "received",
        })
        .returning({ id: income.id });
      await db
        .update(futureReceipts)
        .set({ receivedIncomeId: created[0]?.id ?? null })
        .where(eq(futureReceipts.id, id));
    }
    await db
      .update(futureReceipts)
      .set({ status: "received" })
      .where(eq(futureReceipts.id, id));
    return NextResponse.json({ ok: true });
  }

  if (op === "cancel") {
    await db
      .update(futureReceipts)
      .set({ status: "cancelled" })
      .where(eq(futureReceipts.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.futureReceipts.form.errors.generic);
}
