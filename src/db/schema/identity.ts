import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { amount, amountNullable, id, timestamps } from "./common";
import { currencies } from "./currencies";

/**
 * Cuentas de usuario (Etapa 4: autenticación con Better Auth).
 * `name`, `image` y `email_verified` son campos requeridos por Better Auth;
 * el resto es propio de Money Path.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    status: text("status", { enum: ["active", "suspended", "deleted"] })
      .notNull()
      .default("active"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("users_status_idx").on(t.status)],
);

/** Datos personales del usuario (1:1). */
export const profiles = pgTable(
  "profiles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    birthDate: date("birth_date"),
    /** País actual (MX al lanzamiento; listo para LATAM). */
    country: char("country", { length: 2 }).notNull().default("MX"),
    locale: text("locale").notNull().default("es-MX"),
    avatarUrl: text("avatar_url"),
    ...timestamps,
  },
  (t) => [index("profiles_user_idx").on(t.userId)],
);

/**
 * Contexto financiero base del usuario (1:1).
 * Desde la Etapa 5 guarda también las respuestas del onboarding.
 */
export const financialProfiles = pgTable(
  "financial_profiles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    /** País del usuario (ISO2; "OTHER" fuera del catálogo LATAM inicial). */
    country: char("country", { length: 5 }).notNull().default("MX"),
    /** Moneda base del plan financiero del usuario. */
    baseCurrency: char("base_currency", { length: 3 })
      .notNull()
      .default("MXN")
      .references(() => currencies.code),
    monthlyIncome: amount("monthly_income").default("0"),
    /** Gastos esenciales aproximados (onboarding) / gastos fijos. */
    monthlyFixedExpenses: amount("monthly_fixed_expenses").default("0"),
    incomeFrequency: text("income_frequency", {
      enum: ["monthly", "biweekly", "weekly", "other"],
    })
      .notNull()
      .default("monthly"),
    hasDebts: boolean("has_debts").notNull().default(false),
    totalDebts: amount("total_debts").default("0"),
    currentReserve: amount("current_reserve").default("0"),
    currentInvestments: amount("current_investments").default("0"),
    approximateNetWorth: amount("approximate_net_worth").default("0"),
    /** Objetivo principal elegido en el onboarding. */
    primaryGoal: text("primary_goal", {
      enum: [
        "salir_deudas",
        "crear_reserva",
        "ahorrar",
        "comprar_algo",
        "viajar",
        "invertir",
        "patrimonio",
        "otro",
      ],
    }),
    /** Null hasta completar el onboarding financiero. */
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    /** Meses de gastos fijos que debería cubrir el fondo de emergencia. */
    emergencyFundTargetMonths: numeric("emergency_fund_target_months", {
      precision: 5,
      scale: 2,
    }).default("6"),
    /**
     * Ajuste manual del gasto esencial mensual para el fondo de emergencia
     * (Etapa 11). Null = calcular desde las categorías esenciales.
     */
    essentialMonthlyOverride: amountNullable("essential_monthly_override"),
    riskTolerance: text("risk_tolerance", {
      enum: ["conservative", "moderate", "aggressive"],
    })
      .notNull()
      .default("moderate"),
    ...timestamps,
  },
  (t) => [
    check(
      "financial_profiles_target_months_positive",
      sql`${t.emergencyFundTargetMonths} >= 0`,
    ),
    check("financial_profiles_debts_not_negative", sql`${t.totalDebts} >= 0`),
    check("financial_profiles_reserve_not_negative", sql`${t.currentReserve} >= 0`),
  ],
);

/** Preferencias del usuario en modo clave/valor (espejo de `app_settings`). */
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);
