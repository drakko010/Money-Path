import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { applyAcademyProgress, type AcademyProgressOp } from "@/lib/academy";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PROGRESS_OPS: AcademyProgressOp[] = [
  "open",
  "setProgress",
  "complete",
  "reset",
  "toggleFavorite",
];

function fail(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Academia (Etapa 19): progreso y favoritos del usuario.
 *
 * Operaciones: `open` (registrar visita), `setProgress` (0-100),
 * `complete`, `reset` y `toggleFavorite`.
 *
 * Reglas de seguridad:
 * - El `user_id` viene siempre de la sesión, nunca del cliente (401 sin ella).
 * - El contenido se resuelve por `slug` y debe estar publicado (404 si no).
 * - El avance se guarda en una única fila por usuario+contenido (upsert).
 */
export async function POST(request: Request) {
  const dict = getDictionary();
  const session = await getSession();
  if (!session) return fail(dict.auth.errors.generic, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(dict.academy.errors.invalid);
  }

  const op = body.op;
  if (typeof op !== "string" || !PROGRESS_OPS.includes(op as AcademyProgressOp)) {
    return fail(dict.academy.errors.invalid);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (slug.length === 0 || slug.length > 160) {
    return fail(dict.academy.errors.invalid);
  }

  let pct: number | undefined;
  if (op === "setProgress") {
    const raw = Number(body.pct);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      return fail(dict.academy.errors.invalid);
    }
    pct = raw;
  }

  const result = await applyAcademyProgress(session.user.id, slug, op as AcademyProgressOp, pct);
  if (!result.ok) {
    return fail(
      result.error === "not_found" ? dict.academy.errors.notFound : dict.academy.errors.invalid,
      result.error === "not_found" ? 404 : 400,
    );
  }

  return NextResponse.json({
    ok: true,
    progressPct: result.progressPct,
    isFavorite: result.isFavorite,
    status: result.status,
  });
}
