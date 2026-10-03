import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  expenseCategories,
  expenses,
  financialProfiles,
  income,
  incomeCategories,
} from "@/db/schema";
import type { CurrencyCode } from "@/config/locales";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { toMinorUnits, type MinorUnits } from "@/lib/money";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ParsedRow {
  table: "income" | "expenses";
  date: string;
  description: string;
  amountMinor: MinorUnits;
  categoryName: string | null;
}

function decimal(minor: MinorUnits): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Importación de extractos (CSV ya parseado por el cliente).
 * Regla anti-duplicados: se omite cualquier movimiento que ya exista con la
 * misma (fecha, monto, descripción) para el usuario y tipo.
 */
export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: dict.auth.errors.generic }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { rows?: unknown };
  try {
    body = (await request.json()) as { rows?: unknown };
  } catch {
    return NextResponse.json({ message: dict.presupuesto.form.errors.generic }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ message: dict.presupuesto.import.empty }, { status: 400 });
  }

  const profileRows = await db
    .select()
    .from(financialProfiles)
    .where(eq(financialProfiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile) {
    return NextResponse.json({ message: dict.presupuesto.form.errors.generic }, { status: 400 });
  }
  const currency = profile.baseCurrency as CurrencyCode;

  /* ── 1. Validar y normalizar filas ─────────────────────────────── */
  const parsed: ParsedRow[] = [];
  let errors = 0;

  for (const raw of body.rows.slice(0, MAX_ROWS)) {
    const row = raw as Record<string, unknown>;
    const date = typeof row.date === "string" ? row.date.trim() : "";
    const description = typeof row.description === "string" ? row.description.trim() : "";
    const amountText = typeof row.amount === "string" ? row.amount.trim() : "";
    const typeText = typeof row.type === "string" ? row.type.trim().toLowerCase() : "";
    const categoryName = typeof row.category === "string" && row.category.trim() ? row.category.trim() : null;

    if (!DATE_PATTERN.test(date) || !description || description.length > 200) {
      errors += 1;
      continue;
    }

    let amountMinor: MinorUnits;
    try {
      amountMinor = toMinorUnits(amountText.replace(/-/g, ""), currency);
    } catch {
      errors += 1;
      continue;
    }
    if (amountMinor <= 0) {
      errors += 1;
      continue;
    }

    const negative = amountText.trim().startsWith("-") || amountText.trim().startsWith("(");
    let table: "income" | "expenses";
    if (typeText === "ingreso" || typeText === "income") table = "income";
    else if (typeText === "gasto" || typeText === "expense") table = "expenses";
    else table = negative ? "expenses" : "income";

    parsed.push({ table, date, description, amountMinor, categoryName });
  }

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, duplicates: 0, errors });
  }

  /* ── 2. Deduplicación contra lo existente ──────────────────────── */
  const dates = Array.from(new Set(parsed.map((row) => row.date)));
  const keyOf = (table: string, date: string, minor: number, desc: string) =>
    `${table}|${date}|${minor}|${desc.toLowerCase()}`;

  const [existingIncome, existingExpenses] = await Promise.all([
    db
      .select({ occurredOn: income.occurredOn, amount: income.amount, description: income.description })
      .from(income)
      .where(and(eq(income.userId, userId), eq(income.currency, currency), inArray(income.occurredOn, dates))),
    db
      .select({ occurredOn: expenses.occurredOn, amount: expenses.amount, description: expenses.description })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.currency, currency), inArray(expenses.occurredOn, dates))),
  ]);

  const existingKeys = new Set<string>();
  for (const row of existingIncome) {
    existingKeys.add(keyOf("income", String(row.occurredOn), Math.round(Number(row.amount) * 100), row.description));
  }
  for (const row of existingExpenses) {
    existingKeys.add(keyOf("expenses", String(row.occurredOn), Math.round(Number(row.amount) * 100), row.description));
  }

  const toInsert = parsed.filter(
    (row) => !existingKeys.has(keyOf(row.table, row.date, row.amountMinor, row.description)),
  );
  const duplicates = parsed.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, duplicates, errors });
  }

  /* ── 3. Resolver/crear categorías mencionadas ──────────────────── */
  const categoryNames = Array.from(
    new Set(toInsert.map((row) => row.categoryName).filter((name): name is string => Boolean(name))),
  );

  const incomeCatByName = new Map<string, string>();
  const expenseCatByName = new Map<string, string>();

  if (categoryNames.length > 0) {
    const [incomeCats, expenseCats] = await Promise.all([
      db
        .select({ id: incomeCategories.id, name: incomeCategories.name })
        .from(incomeCategories)
        .where(and(eq(incomeCategories.userId, userId), isNull(incomeCategories.deletedAt))),
      db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(and(eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt))),
    ]);
    for (const row of incomeCats) incomeCatByName.set(row.name.toLowerCase(), row.id);
    for (const row of expenseCats) expenseCatByName.set(row.name.toLowerCase(), row.id);

    // Crear las que no existan (personalización durante la importación).
    for (const name of categoryNames) {
      const lower = name.toLowerCase();
      if (!incomeCatByName.has(lower)) {
        const rows = await db
          .insert(incomeCategories)
          .values({ userId, name, isSystem: false })
          .onConflictDoNothing({ target: [incomeCategories.userId, incomeCategories.name] })
          .returning({ id: incomeCategories.id });
        const id = rows[0]?.id;
        if (id) incomeCatByName.set(lower, id);
      }
      if (!expenseCatByName.has(lower)) {
        const rows = await db
          .insert(expenseCategories)
          .values({ userId, name, kind: "variable", isSystem: false })
          .onConflictDoNothing({ target: [expenseCategories.userId, expenseCategories.name] })
          .returning({ id: expenseCategories.id });
        const id = rows[0]?.id;
        if (id) expenseCatByName.set(lower, id);
      }
    }
  }

  /* ── 4. Insertar ───────────────────────────────────────────────── */
  const incomeInserts = toInsert
    .filter((row) => row.table === "income")
    .map((row) => ({
      userId,
      categoryId: row.categoryName ? (incomeCatByName.get(row.categoryName.toLowerCase()) ?? null) : null,
      description: row.description,
      amount: decimal(row.amountMinor),
      currency,
      occurredOn: row.date,
      status: "received" as const,
    }));
  const expenseInserts = toInsert
    .filter((row) => row.table === "expenses")
    .map((row) => {
      const categoryId = row.categoryName
        ? (expenseCatByName.get(row.categoryName.toLowerCase()) ?? null)
        : null;
      return {
        userId,
        categoryId,
        description: row.description,
        amount: decimal(row.amountMinor),
        currency,
        occurredOn: row.date,
        kind: "variable" as const,
        status: "paid" as const,
      };
    });

  if (incomeInserts.length > 0) await db.insert(income).values(incomeInserts);
  if (expenseInserts.length > 0) await db.insert(expenses).values(expenseInserts);

  return NextResponse.json({
    imported: toInsert.length,
    duplicates,
    errors,
  });
}
