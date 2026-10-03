/**
 * Núcleo monetario de Money Path.
 *
 * Regla de oro: todo monto se representa y calcula en unidades menores
 * enteras (centavos para MXN). Nunca se usa punto flotante para aritmética
 * de dinero. La conversión a decimal ocurre solo en la capa de presentación,
 * vía `Intl.NumberFormat`.
 *
 * En base de datos los montos se guardarán como `numeric(18,2)` y se
 * convertirán a centavos enteros al entrar a la capa de aplicación.
 */

import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  getCurrencyConfig,
  type CurrencyCode,
} from "@/config/locales";

/** Monto expresado en unidades menores enteras (p. ej. centavos). */
export type MinorUnits = number;

/** Redondeo "mitad hacia arriba" con signo (ej. 2.5 → 3, -2.5 → -3). */
export function roundHalfAwayFromZero(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : -Math.floor(-value + 0.5);
}

/** Cantidad de decimales de una moneda (MXN → 2). */
export function currencyDecimals(code: CurrencyCode = DEFAULT_CURRENCY): number {
  return getCurrencyConfig(code).decimals;
}

function factorFor(code: CurrencyCode): number {
  return 10 ** currencyDecimals(code);
}

/**
 * Convierte un monto decimal (número o texto escrito por el usuario) a
 * unidades menores enteras.
 *
 * Convenciones de entrada (es-MX):
 * - "$1,250.50" y "1250.5" → 125050
 * - Si solo hay comas y tienen 1-2 dígitos detrás, se tratan como decimal
 *   ("749,75" → 74975); en otro caso son separadores de miles.
 * - Se aceptan montos negativos ("-1,000.00" → -100000).
 *
 * Lanza `Error` si la entrada no es un monto válido.
 */
export function toMinorUnits(value: number | string, code: CurrencyCode = DEFAULT_CURRENCY): MinorUnits {
  const factor = factorFor(code);

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Monto inválido: ${value}`);
    }
    return roundHalfAwayFromZero(value * factor);
  }

  let text = value.trim().replace(/[$\s]/g, "");
  if (text.length === 0) {
    throw new Error("Monto vacío");
  }

  const negative = text.startsWith("-") || text.startsWith("(");
  text = text.replace(/[-()]/g, "");

  const hasDot = text.includes(".");
  const hasComma = text.includes(",");

  if (hasDot && hasComma) {
    // "1,250.50" → la coma es separador de miles.
    text = text.replace(/,/g, "");
  } else if (hasComma) {
    // "1,250" (miles) vs "749,75" (decimal).
    const parts = text.split(",");
    const looksDecimal = parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2;
    text = looksDecimal ? `${parts[0]}.${parts[1]}` : text.replace(/,/g, "");
  }

  if (!/^\d*\.?\d*$/.test(text) || text === "." || text === "") {
    throw new Error(`Monto inválido: "${value}"`);
  }

  const decimalValue = Number(text);
  if (!Number.isFinite(decimalValue)) {
    throw new Error(`Monto inválido: "${value}"`);
  }

  const minor = roundHalfAwayFromZero(decimalValue * factor);
  return negative ? -minor : minor;
}

/** Convierte unidades menores a número decimal. Solo para presentación. */
export function fromMinorUnits(minor: MinorUnits, code: CurrencyCode = DEFAULT_CURRENCY): number {
  return minor / factorFor(code);
}

/** Garantiza que un valor sea una unidad menor entera válida. */
export function assertMinorUnits(minor: MinorUnits): void {
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`El monto no es una unidad menor entera válida: ${minor}`);
  }
}

/** Suma dos montos con precisión exacta. */
export function addMinor(a: MinorUnits, b: MinorUnits): MinorUnits {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a + b;
}

/** Resta dos montos con precisión exacta. */
export function subtractMinor(a: MinorUnits, b: MinorUnits): MinorUnits {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a - b;
}

/** Multiplica un monto por un factor (p. ej. 12 meses), redondeando a centavo. */
export function multiplyMinor(minor: MinorUnits, factor: number): MinorUnits {
  assertMinorUnits(minor);
  if (!Number.isFinite(factor)) {
    throw new Error(`Factor inválido: ${factor}`);
  }
  return roundHalfAwayFromZero(minor * factor);
}

/** Suma una lista de montos. */
export function sumMinor(values: readonly MinorUnits[]): MinorUnits {
  return values.reduce((acc, value) => addMinor(acc, value), 0);
}

/** Compara dos montos: -1 si a < b, 0 si iguales, 1 si a > b. */
export function compareMinor(a: MinorUnits, b: MinorUnits): -1 | 0 | 1 {
  assertMinorUnits(a);
  assertMinorUnits(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isZeroMinor(minor: MinorUnits): boolean {
  assertMinorUnits(minor);
  return minor === 0;
}

export interface FormatMoneyOptions {
  currency?: CurrencyCode;
  locale?: string;
  /** Mostrar el código ISO ("2,000.25 MXN") en lugar del símbolo. */
  withCurrencyCode?: boolean;
}

/** Formatea un monto en unidades menores para mostrar al usuario. */
export function formatMoney(minor: MinorUnits, options: FormatMoneyOptions = {}): string {
  assertMinorUnits(minor);
  const currency = options.currency ?? DEFAULT_CURRENCY;
  const locale = options.locale ?? DEFAULT_LOCALE;
  const config = getCurrencyConfig(currency);
  const amount = fromMinorUnits(minor, currency);

  if (options.withCurrencyCode) {
    const numeric = new Intl.NumberFormat(locale, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
    return `${numeric} ${currency}`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}
