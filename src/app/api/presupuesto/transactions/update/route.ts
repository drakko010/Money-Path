import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, futureReceipts, income } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const OPERATIONS = ["markReceived", "markPaid", "cancel", "delete"] as const;
type Operation = (typeof OPERATIONS)[number];

/**
 * Operaciones sobre un movimiento existente (siempre del usuario de la
 * sesión): marcar recibido/pagado, cancelar o eliminar (borrado suave).
 */
export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: dict.auth.errors.generic }, { status: 401 });
  }
  const userId = session.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: dict.presupuesto.form.errors.generic }, { status: 400 });
  }

  const table = body.table;
  const id = typeof body.id === "string" ? body.id : "";
  const op = body.op as Operation;
  if ((table !== "income" && table !== "expenses") || !id || !OPERATIONS.includes(op)) {
    return NextResponse.json({ message: dict.presupuesto.form.errors.generic }, { status: 400 });
  }

  const ownership =
    table === "income"
      ? and(eq(income.id, id), eq(income.userId, userId))
      : and(eq(expenses.id, id), eq(expenses.userId, userId));

  const now = new Date();

  if (op === "delete") {
    if (table === "income") {
      await db.update(income).set({ deletedAt: now }).where(ownership);
    } else {
      await db.update(expenses).set({ deletedAt: now }).where(ownership);
    }
    return NextResponse.json({ ok: true });
  }

  if (table === "income") {
    if (op === "markReceived") {
      await db.update(income).set({ status: "received" }).where(ownership);
      // Concretar el cobro futuro vinculado, si existe.
      await db
        .update(futureReceipts)
        .set({ status: "received" })
        .where(and(eq(futureReceipts.userId, userId), eq(futureReceipts.receivedIncomeId, id)));
      return NextResponse.json({ ok: true });
    }
    if (op === "cancel") {
      await db.update(income).set({ status: "cancelled" }).where(ownership);
      return NextResponse.json({ ok: true });
    }
  } else {
    if (op === "markPaid") {
      await db.update(expenses).set({ status: "paid" }).where(ownership);
      return NextResponse.json({ ok: true });
    }
    if (op === "cancel") {
      await db.update(expenses).set({ status: "cancelled" }).where(ownership);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ message: dict.presupuesto.form.errors.generic }, { status: 400 });
}
