import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories, incomeCategories } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Categorías personalizadas del presupuesto:
 * - `create`: crea una categoría de ingreso o gasto (única por usuario).
 * - `archive`: archiva (borrado suave); los movimientos conservan su historial.
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
    return NextResponse.json({ message: dict.presupuesto.categories.invalid }, { status: 400 });
  }

  const op = body.op;
  const kind = body.kind === "income" ? "income" : body.kind === "expense" ? "expense" : null;
  if (!kind) {
    return NextResponse.json({ message: dict.presupuesto.categories.invalid }, { status: 400 });
  }

  if (op === "create") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 60) {
      return NextResponse.json({ message: dict.presupuesto.categories.invalid }, { status: 400 });
    }

    if (kind === "income") {
      const existing = await db
        .select({ id: incomeCategories.id })
        .from(incomeCategories)
        .where(
          and(eq(incomeCategories.userId, userId), sql`lower(${incomeCategories.name}) = lower(${name})`),
        )
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ message: dict.presupuesto.categories.exists }, { status: 409 });
      }
      const rows = await db
        .insert(incomeCategories)
        .values({ userId, name, isSystem: false })
        .returning({ id: incomeCategories.id });
      return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
    }

    const expenseKind = body.expenseKind === "fixed" ? "fixed" : "variable";
    const existing = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(
        and(eq(expenseCategories.userId, userId), sql`lower(${expenseCategories.name}) = lower(${name})`),
      )
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ message: dict.presupuesto.categories.exists }, { status: 409 });
    }
    const rows = await db
      .insert(expenseCategories)
      .values({ userId, name, kind: expenseKind, isSystem: false })
      .returning({ id: expenseCategories.id });
    return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
  }

  if (op === "archive") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ message: dict.presupuesto.categories.invalid }, { status: 400 });
    }
    const now = new Date();
    if (kind === "income") {
      await db
        .update(incomeCategories)
        .set({ status: "archived", deletedAt: now })
        .where(and(eq(incomeCategories.id, id), eq(incomeCategories.userId, userId)));
    } else {
      await db
        .update(expenseCategories)
        .set({ status: "archived", deletedAt: now })
        .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: dict.presupuesto.categories.invalid }, { status: 400 });
}
