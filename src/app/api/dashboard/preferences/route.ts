import { NextResponse } from "next/server";
import {
  INDICATOR_IDS,
  isIndicatorId,
  setVisibleIndicators,
  type IndicatorId,
} from "@/lib/dashboard";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Personalización del dashboard: qué indicadores se muestran en Inicio.
 * Se guarda por usuario de sesión en `user_settings`.
 */
export async function POST(request: Request) {
  const dict = getDictionary();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: dict.auth.errors.generic }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: dict.dashboard.customize.saveError }, { status: 400 });
  }

  const visible = (body as { visible?: unknown }).visible;
  if (!Array.isArray(visible)) {
    return NextResponse.json({ message: dict.dashboard.customize.saveError }, { status: 400 });
  }

  const valid = visible.filter(
    (entry): entry is IndicatorId => typeof entry === "string" && isIndicatorId(entry),
  );
  // Sin duplicados y al menos un indicador visible.
  const unique = Array.from(new Set(valid));
  if (unique.length === 0) {
    return NextResponse.json({ message: dict.dashboard.customize.minOne }, { status: 400 });
  }

  // Orden canónico del producto, independiente del orden recibido.
  const ordered = INDICATOR_IDS.filter((id) => unique.includes(id));

  await setVisibleIndicators(session.user.id, [...ordered]);

  return NextResponse.json({ ok: true, visible: ordered });
}
