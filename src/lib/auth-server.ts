/**
 * Autenticación de Money Path (Etapa 4) — Better Auth.
 *
 * - Contraseñas: Better Auth las hashea y guarda en `accounts`
 *   (provider "credential"). Nunca se almacenan en texto plano ni en `users`.
 * - Sesiones: cookie httpOnly + tabla `sessions` (persistente, 30 días).
 * - Al registrarse se crean automáticamente el perfil, el perfil financiero
 *   y las categorías base del usuario (hook `user.create.after`).
 *
 * SOLO IMPORTAR EN CÓDIGO DE SERVIDOR.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  appSettings,
  expenseCategories,
  financialProfiles,
  incomeCategories,
  profiles,
  sessions,
  users,
  verifications,
} from "@/db/schema";

/* ── Resolución del secreto ──────────────────────────────────────────────
 * Prioridad: `BETTER_AUTH_SECRET` (env). Si no existe, se usa un secreto
 * persistente guardado en `app_settings` (creado en la primera ejecución).
 * Esto evita que la autenticación se rompa si el entorno no propaga el env.
 */

const SECRET_SETTING_KEY = "auth.secret";

async function resolveAuthSecret(): Promise<string> {
  const fromEnv = process.env.BETTER_AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }

  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SECRET_SETTING_KEY))
    .limit(1);
  const existing = rows[0]?.value;
  if (typeof existing === "string" && existing.length >= 32) {
    return existing;
  }

  const generated = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await db
    .insert(appSettings)
    .values({ key: SECRET_SETTING_KEY, value: generated })
    .onConflictDoNothing({ target: appSettings.key });

  const afterInsert = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SECRET_SETTING_KEY))
    .limit(1);
  const persisted = afterInsert[0]?.value;
  if (typeof persisted === "string" && persisted.length >= 32) {
    return persisted;
  }
  return generated;
}

/* ── Correo de restablecimiento de contraseña ─────────────────────────── */

interface DevResetEntry {
  email: string;
  url: string;
  createdAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __mpDevResetLink?: DevResetEntry;
};

/** Última solicitud de restablecimiento en entornos sin servicio de correo. */
export function getDevResetLink(): DevResetEntry | undefined {
  return globalStore.__mpDevResetLink;
}

async function sendResetPasswordEmail(toEmail: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "Money Path <noreply@moneypath.mx>",
          to: [toEmail],
          subject: "Restablece tu contraseña de Money Path",
          html: `<p>Hola. Usa el siguiente enlace para restablecer tu contraseña:</p><p><a href="${url}">Restablecer contraseña</a></p><p>Si no lo solicitaste, ignora este correo.</p>`,
        }),
      });
      return;
    } catch (error) {
      console.error("[auth] No se pudo enviar el correo de restablecimiento", error);
    }
  }

  // Entorno sin SMTP/Resend: se conserva el enlace para la herramienta de
  // desarrollo (`/api/auth/dev/reset-link`), deshabilitada fuera de previews.
  globalStore.__mpDevResetLink = {
    email: toEmail,
    url,
    createdAt: Date.now(),
  };
  console.log(`[auth] Enlace de restablecimiento para ${toEmail}: ${url}`);
}

/* ── Perfil financiero básico tras el registro ────────────────────────── */

const DEFAULT_INCOME_CATEGORIES = ["Sueldo", "Negocio", "Otros ingresos"];

// `essential` marca las categorías que cuentan para el fondo de emergencia
// (Etapa 11). Las discrecionales quedan fuera por defecto.
const DEFAULT_EXPENSE_CATEGORIES: Array<{
  name: string;
  kind: "fixed" | "variable";
  essential: boolean;
}> = [
  { name: "Renta o hipoteca", kind: "fixed", essential: true },
  { name: "Servicios (luz, agua, gas)", kind: "fixed", essential: true },
  { name: "Internet y teléfono", kind: "fixed", essential: true },
  { name: "Suscripciones", kind: "fixed", essential: false },
  { name: "Transporte", kind: "variable", essential: true },
  { name: "Súper y despensa", kind: "variable", essential: true },
  { name: "Comida fuera", kind: "variable", essential: false },
  { name: "Salud", kind: "variable", essential: true },
  { name: "Educación", kind: "variable", essential: true },
  { name: "Entretenimiento", kind: "variable", essential: false },
  { name: "Otros gastos", kind: "variable", essential: false },
];

async function createBasicProfile(userId: string, name: string) {
  try {
    await db.insert(profiles).values({ userId, displayName: name });
    await db.insert(financialProfiles).values({ userId });

    if (DEFAULT_INCOME_CATEGORIES.length > 0) {
      await db.insert(incomeCategories).values(
        DEFAULT_INCOME_CATEGORIES.map((category, index) => ({
          userId,
          name: category,
          isSystem: true,
          sortOrder: index,
        })),
      );
    }
    await db.insert(expenseCategories).values(
      DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
        userId,
        name: category.name,
        kind: category.kind,
        isEssential: category.essential,
        isSystem: true,
        sortOrder: index,
      })),
    );
  } catch (error) {
    // El registro no debe fallar por el perfil; se registra para auditoría.
    console.error("[auth] No se pudo crear el perfil financiero básico", error);
  }
}

/* ── Instancia de Better Auth (lazy: el secreto puede venir de la BD) ─── */

function buildAuth(secret: string) {
  return betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret,
  /*
   * Sin baseURL fija: el origen se deriva de cada request, por lo que el
   * preview sigue funcionando aunque cambie de host entre despliegues.
   * trustedOrigins (con wildcard) autoriza el origen en los POST.
   */
  trustedOrigins: (request?: Request) => {
    const staticOrigins = [
      "https://*.e2b.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ];
    // El preview puede servirse bajo hosts proxy: se confía además en el
    // propio origen del request cuando es un dominio de preview (e2b).
    try {
      if (request) {
        const url = new URL(request.url);
        if (url.hostname.endsWith("e2b.app")) {
          return [...staticOrigins, url.origin];
        }
      }
    } catch {
      // URL inválida: solo los orígenes estáticos.
    }
    return staticOrigins;
  },
  advanced: {
    database: {
      // Las columnas de identidad son UUID: Better Auth debe generarlas así.
      generateId: "uuid",
    },
  },
  session: {
    // Sesión persistente: 30 días, renovación tras actividad diaria.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    /*
     * Bearer: además de la cookie, la sesión puede viajar como
     * `Authorization: Bearer <token>`. Es el mecanismo de respaldo para
     * contextos donde el navegador bloquea cookies de terceros (p. ej.
     * el preview embebido en un iframe): el token se guarda en
     * localStorage desde el cliente.
     */
    bearer(),
  ],
  // Límites generosos para uso/demo (el default bloquea pruebas repetidas).
  rateLimit: {
    window: 60,
    max: 200,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // La verificación por correo llegará con el servicio de email.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createBasicProfile(user.id, user.name);
        },
      },
    },
  },
  });
}

export type AuthInstance = ReturnType<typeof buildAuth>;

let authInstancePromise: Promise<AuthInstance> | null = null;

/**
 * Devuelve la instancia de Better Auth (inicialización lazy). El servidor
 * debe usar SIEMPRE esta función en lugar de una referencia estática.
 */
export function getAuth(): Promise<AuthInstance> {
  if (!authInstancePromise) {
    authInstancePromise = resolveAuthSecret()
      .then(buildAuth)
      .catch((error) => {
        authInstancePromise = null; // permite reintentar en el siguiente request
        throw error;
      });
  }
  return authInstancePromise;
}
