/**
 * Cliente de autenticación para componentes de navegador.
 *
 * Sesión dual:
 * 1. Cookie httpOnly (mecanismo principal).
 * 2. Token Bearer en `localStorage` (respaldo): si el navegador bloquea
 *    cookies de terceros —p. ej. cuando el preview corre embebido en un
 *    iframe— la sesión sigue funcionando vía `Authorization: Bearer`.
 *
 * No expone datos financieros: solo gestiona la sesión.
 */
import { createAuthClient } from "better-auth/react";

export const SESSION_TOKEN_KEY = "mp_session_token";

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeSessionToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // localStorage bloqueado: la cookie sigue siendo el mecanismo primario.
  }
}

export function clearSessionToken(): void {
  storeSessionToken(null);
}

export const authClient = createAuthClient({
  fetchOptions: {
    // Adjunta el token Bearer guardado a todas las peticiones de auth.
    customFetchImpl: async (input, init) => {
      const token = getStoredSessionToken();
      if (token) {
        const headers = new Headers(init?.headers);
        if (!headers.has("authorization")) {
          headers.set("authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
      return fetch(input, init);
    },
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;

/** Valida el parámetro `next` evitando redirecciones abiertas. */
export function safeNextPath(value: string | null | undefined): string {
  if (
    value &&
    value.startsWith("/app") &&
    !value.startsWith("//") &&
    !value.includes("://")
  ) {
    return value;
  }
  return "/app";
}

/**
 * Extrae el token de sesión de la respuesta de sign-in/sign-up:
 * primero del cuerpo (`token`), luego del header `set-auth-token`.
 */
export function extractSessionToken(ctx: {
  data?: unknown;
  response?: Response;
}): string | null {
  const data = ctx.data as { token?: unknown } | undefined;
  if (typeof data?.token === "string" && data.token) {
    return data.token;
  }
  try {
    const fromHeader = ctx.response?.headers?.get("set-auth-token");
    if (fromHeader) return fromHeader;
  } catch {
    // sin header accesible
  }
  return null;
}
