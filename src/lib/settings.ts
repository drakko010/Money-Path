/**
 * Acceso a la configuración de la aplicación (tabla `app_settings`).
 *
 * Los defaults (región y moneda) se siembran de forma idempotente la
 * primera vez que se leen: si la tabla está vacía se insertan; si ya
 * existen, nunca se sobrescriben.
 */

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  isCurrencyCode,
  isLocaleCode,
  type CurrencyCode,
  type LocaleCode,
} from "@/config/locales";

export const SETTING_KEYS = {
  defaultLocale: "defaults.locale",
  defaultCurrency: "defaults.currency",
} as const;

const DEFAULT_VALUES: Record<string, string> = {
  [SETTING_KEYS.defaultLocale]: DEFAULT_LOCALE,
  [SETTING_KEYS.defaultCurrency]: DEFAULT_CURRENCY,
};

export interface AppSettings {
  defaultLocale: LocaleCode;
  defaultCurrency: CurrencyCode;
  /** "db" si los valores vinieron de la base; "defaults" si hubo fallback. */
  source: "db" | "defaults";
}

function normalize(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === "string") return inner;
  }
  return "";
}

export async function getAppSettings(): Promise<AppSettings> {
  // Siembra idempotente de defaults (ON CONFLICT DO NOTHING).
  await db
    .insert(appSettings)
    .values(
      Object.entries(DEFAULT_VALUES).map(([key, value]) => ({ key, value })),
    )
    .onConflictDoNothing({ target: appSettings.key });

  const rows = await db.select().from(appSettings);
  const map = new Map<string, string>(
    rows.map((row) => [row.key, normalize(row.value)]),
  );

  const locale = map.get(SETTING_KEYS.defaultLocale) ?? "";
  const currency = map.get(SETTING_KEYS.defaultCurrency) ?? "";

  return {
    defaultLocale: isLocaleCode(locale) ? locale : DEFAULT_LOCALE,
    defaultCurrency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    source: map.size > 0 ? "db" : "defaults",
  };
}
