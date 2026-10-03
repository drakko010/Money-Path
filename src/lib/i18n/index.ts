/**
 * Capa de internacionalización de Money Path.
 *
 * Decisiones (Etapa 0):
 * - El producto se lanza en español de México (`es-MX`).
 * - Los textos viven en diccionarios tipados por locale; añadir un idioma
 *   nuevo = añadir un archivo con la misma forma que `es-MX`.
 * - El servidor elige el diccionario; los componentes nunca concatenan
 *   textos en el idioma equivocado.
 */

import type { LocaleCode } from "@/config/locales";
import { DEFAULT_LOCALE, isLocaleCode } from "@/config/locales";
import { esMX } from "./dictionaries/es-MX";

export type Dictionary = typeof esMX;

const dictionaries: Record<LocaleCode, Dictionary> = {
  "es-MX": esMX,
};

/** Devuelve el diccionario del locale pedido (con fallback al locale base). */
export function getDictionary(locale?: string | null): Dictionary {
  if (locale && isLocaleCode(locale)) {
    return dictionaries[locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

/**
 * Resuelve una clave con puntos ("hero.title") dentro del diccionario.
 * Útil para textos derivados de datos; el acceso tipado directo
 * (`dict.hero.title`) sigue siendo la vía preferida en componentes.
 */
export function translate(dict: Dictionary, path: string): string {
  let node: unknown = dict;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof node === "string" ? node : path;
}
