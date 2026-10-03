/**
 * Protección del aplicativo (Etapa 4).
 *
 * La autenticación ya está implementada con Better Auth: `requireAuth()`
 * valida la sesión en el servidor y redirige a `/login` si no existe.
 * Toda consulta de datos financieros debe filtrarse por el usuario de la
 * sesión — nunca confiar en el frontend.
 *
 * SOLO IMPORTAR EN CÓDIGO DE SERVIDOR.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth-server";

export function isAuthEnabled(): boolean {
  return true;
}

/** Sesión actual (o null), resuelta desde la cookie/Bearer en el servidor. */
export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Guard del aplicativo: exige sesión válida. Se llama en el layout de
 * `/app`, así que todas las páginas financieras quedan protegidas.
 */
export async function requireAuth() {
  if (!isAuthEnabled()) return null;

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** Valida el parámetro `next` para evitar redirecciones abiertas. */
export function safeNext(value: string | null | undefined): string {
  if (value && value.startsWith("/app") && !value.startsWith("//") && !value.includes("://")) {
    return value;
  }
  return "/app";
}
