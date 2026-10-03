import { NextResponse } from "next/server";
import { getDevResetLink } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/**
 * Herramienta SOLO para entornos de preview sin servicio de correo:
 * devuelve el último enlace de restablecimiento solicitado.
 * Deshabilitada si `NEXT_PUBLIC_AUTH_DEV_RESET` no es "true".
 */
export async function GET(request: Request) {
  if (process.env.NEXT_PUBLIC_AUTH_DEV_RESET !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email")?.toLowerCase();
  const entry = getDevResetLink();

  if (!email || !entry || entry.email.toLowerCase() !== email) {
    return NextResponse.json({ link: null });
  }

  return NextResponse.json({ link: entry.url });
}
