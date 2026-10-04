import { NextResponse } from "next/server";
import type { CurrencyCode } from "@/config/locales";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseCategories,
  financialProfiles,
  incomeCategories,
  recurringTransactions,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";
import {
  applyScopedEdit,
  ensureOccurrences,
  isRecurringFrequency,
  isValidIsoDate,
  type EditScope,
  type RecurringFrequency,
} from "@/lib/recurring";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Plantillas recurrentes (Etapa 8):
 * - `create`: crea plantilla + genera ocurrencias idempotentes.
 * - `update`: edición por alcance (solo esta / esta y próximas / toda la serie).
 * - `pause` / `resume`: detiene o reanuda la generación.
 * - `delete`: borrado suave de la plantilla (el historial se conserva).
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
    return fail(dict.recurring.errors.generic);
  }

  const profileRows = await db
    .select({ baseCurrency: financialProfiles.baseCurrency })
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const currency = profileRows[0]?.baseCurrency ?? "MXN";
  const op = body.op;

  /* ── create ─────────────────────────────────────────────────────── */
  if (op === "create") {
    const kind = body.kind === "income" ? "income" : body.kind === "expense" ? "expense" : null;
    if (!kind) return fail(dict.recurring.errors.generic);

    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!description || description.length > 200) return fail(dict.recurring.form.errors.description);

    const amountText = typeof body.amount === "string" ? body.amount : "";
    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(amountText, currency as CurrencyCode);
    } catch {
      return fail(dict.recurring.form.errors.amount);
    }
    if (amountMinor <= 0) return fail(dict.recurring.form.errors.amount);

    const frequency =
      typeof body.frequency === "string" && isRecurringFrequency(body.frequency)
        ? (body.frequency as RecurringFrequency)
        : null;
    if (!frequency) return fail(dict.recurring.errors.generic);

    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    if (!isValidIsoDate(startDate)) return fail(dict.recurring.form.errors.startDate);

    const endDate = typeof body.endDate === "string" && body.endDate.trim() ? body.endDate.trim() : null;
    if (endDate && (!isValidIsoDate(endDate) || endDate < startDate)) {
      return fail(dict.recurring.form.errors.endDate);
    }

    const categoryId = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
    if (categoryId) {
      const owner =
        kind === "income"
          ? await db
              .select({ id: incomeCategories.id })
              .from(incomeCategories)
              .where(and(eq(incomeCategories.id, categoryId), eq(incomeCategories.userId, userId), isNull(incomeCategories.deletedAt)))
              .limit(1)
          : await db
              .select({ id: expenseCategories.id })
              .from(expenseCategories)
              .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)))
              .limit(1);
      if (owner.length === 0) return fail(dict.presupuesto.form.errors.category);
    }

    await db.insert(recurringTransactions).values({
      userId,
      kind,
      incomeCategoryId: kind === "income" ? categoryId : null,
      expenseCategoryId: kind === "expense" ? categoryId : null,
      description,
      amount: decimal(amountMinor),
      currency,
      frequency,
      startDate,
      endDate,
      nextOccurrence: startDate,
      status: "active",
    });

    await ensureOccurrences(userId);
    return NextResponse.json({ ok: true });
  }

  /* ── operaciones sobre plantilla existente ──────────────────────── */
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(dict.recurring.errors.generic);

  const templates = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, userId),
        isNull(recurringTransactions.deletedAt),
      ),
    )
    .limit(1);
  if (templates.length === 0) return fail(dict.recurring.errors.notFound, 404);
  const template = templates[0];

  if (op === "update") {
    const scope = body.scope === "one" || body.scope === "following" || body.scope === "all"
      ? (body.scope as EditScope)
      : null;
    if (!scope) return fail(dict.recurring.errors.generic);

    const refDate = typeof body.refDate === "string" && body.refDate ? body.refDate : String(template.nextOccurrence);
    if (!isValidIsoDate(refDate)) return fail(dict.recurring.form.errors.startDate);

    const patch: Parameters<typeof applyScopedEdit>[2] = {};
    if (typeof body.description === "string" && body.description.trim()) {
      patch.description = body.description.trim().slice(0, 200);
    }
    if (typeof body.amount === "string" && body.amount.trim()) {
      let amountMinor: MinorUnits;
      try {
        amountMinor = toMinorUnits(body.amount.trim(), currency as CurrencyCode);
      } catch {
        return fail(dict.recurring.form.errors.amount);
      }
      if (amountMinor <= 0) return fail(dict.recurring.form.errors.amount);
      patch.amount = decimal(amountMinor);
    }
    if (body.categoryId !== undefined) {
      const value = typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
      if (value) {
        const owner =
          template.kind === "income"
            ? await db
                .select({ id: incomeCategories.id })
                .from(incomeCategories)
                .where(and(eq(incomeCategories.id, value), eq(incomeCategories.userId, userId)))
                .limit(1)
            : await db
                .select({ id: expenseCategories.id })
                .from(expenseCategories)
                .where(and(eq(expenseCategories.id, value), eq(expenseCategories.userId, userId)))
                .limit(1);
        if (owner.length === 0) return fail(dict.presupuesto.form.errors.category);
      }
      patch.categoryId = value;
    }
    if (body.frequency !== undefined) {
      if (typeof body.frequency !== "string" || !isRecurringFrequency(body.frequency)) {
        return fail(dict.recurring.errors.generic);
      }
      patch.frequency = body.frequency as RecurringFrequency;
    }
    if (body.endDate !== undefined) {
      const value = typeof body.endDate === "string" && body.endDate.trim() ? body.endDate.trim() : null;
      if (value && !isValidIsoDate(value)) return fail(dict.recurring.form.errors.endDate);
      patch.endDate = value;
    }

    if (Object.keys(patch).length === 0) return fail(dict.recurring.errors.generic);

    const result = await applyScopedEdit(userId, id, patch, scope, refDate, currency);
    if (!result.ok) {
      return fail(
        result.message === "occurrence_not_found"
          ? dict.recurring.errors.occurrenceNotFound
          : dict.recurring.errors.notFound,
        404,
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (op === "pause" || op === "resume") {
    await db
      .update(recurringTransactions)
      .set({ status: op === "pause" ? "paused" : "active" })
      .where(eq(recurringTransactions.id, id));
    if (op === "resume") await ensureOccurrences(userId);
    return NextResponse.json({ ok: true });
  }

  if (op === "delete") {
    await db
      .update(recurringTransactions)
      .set({ deletedAt: new Date(), status: "cancelled" })
      .where(eq(recurringTransactions.id, id));
    return NextResponse.json({ ok: true });
  }

  return fail(dict.recurring.errors.generic);
}
