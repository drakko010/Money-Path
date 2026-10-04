import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth-server";

/**
 * Manejador de todos los endpoints de Better Auth (`/api/auth/*`).
 *
 * Las cookies de autenticación se reescriben a `SameSite=None; Secure;
 * Partitioned` para que la sesión funcione también cuando el preview se
 * abre embebido en un iframe de otro origen (panel de Arena). En acceso
 * directo esto sigue siendo válido y seguro (HttpOnly + Secure). Además,
 * el plugin `bearer` permite sesión vía `Authorization: Bearer <token>`
 * como respaldo cuando el navegador bloquea cookies de terceros.
 */

function fixCookieAttributes(cookie: string): string {
  let fixed = cookie.replace(/;\s*SameSite=\w+/gi, "");
  fixed = fixed.replace(/;\s*Partitioned/gi, "");
  fixed = fixed.replace(/;\s*Secure/gi, "");
  return `${fixed}; Secure; SameSite=None; Partitioned`;
}

async function withEmbeddableCookies(
  responsePromise: Promise<Response> | Response,
): Promise<Response> {
  const response = await responsePromise;
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  if (setCookies.length === 0) return response;

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of setCookies) {
    headers.append("set-cookie", fixCookieAttributes(cookie));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(request: NextRequest) {
  const auth = await getAuth();
  return withEmbeddableCookies(auth.handler(request));
}

export async function POST(request: NextRequest) {
  const auth = await getAuth();
  return withEmbeddableCookies(auth.handler(request));
}
