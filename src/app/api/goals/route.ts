import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { financialProfiles, goalContributions, goals } from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import { isGoalCategory } from "@/lib/goals-shared";
import { decimal, registerContribution } from "@/lib/goals";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Metas (Etapa 12):
 * - `create`: crea la meta con valor objetivo, actual, plazo y prioridad.
 * - `contribute`: registra un aporte y actualiza el progreso automáticamente.
 * - `delete`: borrado suave (las contribuciones quedan en el historial).
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
    return fail(dict.goalsModule.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  if (profileRows.length === 0) return fail(dict.goalsModule.errors.generic, 404);
  const currency = profileRows[0].baseCurrency as CurrencyCode;
  const op = body.op;

  /* ── create ─────────────────────────────────────────────────────── */
  if (op === "create") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 120) return fail(dict.goalsModule.errors.name);

    const category =
      typeof body.category === "string" && isGoalCategory(body.category) ? body.category : "otro";

    let targetMinor: MinorUnits;
    try {
      targetMinor = toMinorUnits(typeof body.targetAmount === "string" ? body.targetAmount : "", currency);
    } catch {
      return fail(dict.goalsModule.errors.target);
    }
    if (targetMinor <= 0) return fail(dict.goalsModule.errors.target);

    let currentMinor: MinorUnits = 0;
    if (typeof body.currentAmount === "string" && body.currentAmount.trim()) {
      try {
        currentMinor = toMinorUnits(body.currentAmount, currency);
      } catch {
        return fail(dict.goalsModule.errors.current);
      }
      if (currentMinor < 0) return fail(dict.goalsModule.errors.current);
      if (currentMinor > targetMinor) return fail(dict.goalsModule.errors.currentExceeds);
    }

    const targetDate =
      typeof body.targetDate === "string" && DATE_PATTERN.test(body.targetDate)
        ? body.targetDate
        : null;

    const priorityRaw = Number(body.priority);
    const priority = [1, 2, 3].includes(priorityRaw) ? priorityRaw : 2;

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 300)
        : null;

    await db.insert(goals).values({
      userId,
      name,
      description,
      category,
      targetAmount: decimal(targetMinor),
      currency,
      currentAmount: decimal(currentMinor),
      targetDate,
      priority,
      status: targetMinor > 0 && currentMinor >= targetMinor ? "achieved" : "active",
    });

    return NextResponse.json({ ok: true });
  }

  /* ── operaciones sobre meta existente ───────────────────────────── */
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(dict.goalsModule.errors.generic);

  if (op === "contribute") {
    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(typeof body.amount === "string" ? body.amount : "", currency);
    } catch {
      return fail(dict.goalsModule.errors.amount);
    }
    if (amountMinor <= 0) return fail(dict.goalsModule.errors.amount);

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;
    const result = await registerContribution(userId, id, amountMinor, currency, note);
    if (!result.ok) return fail(dict.goalsModule.errors.notFound, 404);
    return NextResponse.json({ ok: true, current: result.newCurrent });
  }

  if (op === "delete") {
    const owner = await db
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId), isNull(goals.deletedAt)))
      .limit(1);
    if (owner.length === 0) return fail(dict.goalsModule.errors.notFound, 404);

    await db.update(goals).set({ deletedAt: new Date(), status: "abandoned" }).where(eq(goals.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.goalsModule.errors.generic);
}
