import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getDictionary } from "@/lib/i18n";
import { getAppSettings } from "@/lib/settings";
import { addMinor, formatMoney, toMinorUnits } from "@/lib/money";
import { getCurrencyConfig, getLocaleConfig } from "@/config/locales";

type CheckTone = "success" | "danger" | "neutral";

function CheckChip({ tone, label }: { tone: CheckTone; label: string }) {
  const toneClasses: Record<CheckTone, string> = {
    success: "bg-success-soft text-success-strong border-success/25",
    danger: "bg-danger-soft text-danger-strong border-danger/25",
    neutral: "bg-background text-muted border-border",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${toneClasses[tone]}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "success"
            ? "bg-success"
            : tone === "danger"
              ? "bg-danger"
              : "bg-faint"
        }`}
      />
      {label}
    </span>
  );
}

function Row({
  label,
  sub,
  detail,
  chip,
}: {
  label: string;
  sub: string;
  detail?: string;
  chip: { tone: CheckTone; label: string };
}) {
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-text">{label}</p>
        <p className="mt-0.5 text-xs text-faint">{sub}</p>
        {detail ? (
          <p className="mt-1.5 font-display text-sm font-medium tabular-nums text-primary-700">
            {detail}
          </p>
        ) : null}
      </div>
      <CheckChip tone={chip.tone} label={chip.label} />
    </li>
  );
}

/**
 * Verificación en vivo de la fundación. Componente de servidor asíncrono:
 * consulta la base real y demuestra el núcleo monetario con un cálculo
 * verdadero. Nunca usa datos simulados.
 */
export async function FoundationStatus() {
  const dict = getDictionary();

  let dbConnected = false;
  try {
    await db.execute(sql`select 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  let settings: Awaited<ReturnType<typeof getAppSettings>> | null = null;
  if (dbConnected) {
    try {
      settings = await getAppSettings();
    } catch {
      settings = null;
    }
  }

  const currency = settings?.defaultCurrency ?? "MXN";
  const locale = settings?.defaultLocale ?? "es-MX";
  const localeConfig = getLocaleConfig(locale);
  const currencyConfig = getCurrencyConfig(currency);

  // Prueba real del núcleo monetario: 1,250.50 + 749.75 = 2,000.25.
  const summandA = toMinorUnits("1,250.50", currency);
  const summandB = toMinorUnits("749.75", currency);
  const total = addMinor(summandA, summandB);
  const moneyVerified = total === 200025;

  return (
    <section
      aria-label={dict.status.title}
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border/70 bg-primary-soft/70 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-primary-900">
            {dict.status.title}
          </h2>
          <p className="mt-0.5 text-xs text-faint">{dict.status.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-surface px-3 py-1 text-xs font-bold text-primary-700">
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-accent-500" />
          {dict.status.live}
        </span>
      </header>

      <ul className="divide-y divide-border/60">
        <Row
          label={dict.status.dbLabel}
          sub={dict.status.dbSub}
          chip={
            dbConnected
              ? { tone: "success", label: dict.status.dbOk }
              : { tone: "danger", label: dict.status.dbError }
          }
        />

        {settings ? (
          <Row
            label={dict.status.settingsLabel}
            sub={
              settings.source === "db"
                ? dict.status.sourceDb
                : dict.status.sourceFallback
            }
            detail={`${dict.status.localeRow}: ${localeConfig.label} · ${dict.status.currencyRow}: ${currencyConfig.label} (${currency})`}
            chip={{ tone: "success", label: dict.states.success }}
          />
        ) : (
          <Row
            label={dict.status.settingsLabel}
            sub={dict.status.settingsSub}
            chip={{ tone: "danger", label: dict.status.settingsUnavailable }}
          />
        )}

        <Row
          label={dict.status.moneyLabel}
          sub={dict.status.moneySub}
          detail={`${formatMoney(summandA, { currency, locale })} + ${formatMoney(summandB, { currency, locale })} = ${formatMoney(total, { currency, locale })}`}
          chip={
            moneyVerified
              ? { tone: "success", label: dict.status.moneyOk }
              : { tone: "danger", label: dict.status.moneyError }
          }
        />
      </ul>
    </section>
  );
}

/** Estado de carga del panel de verificación (Suspense fallback). */
export function FoundationStatusSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="border-b border-border/70 bg-primary-soft/70 px-5 py-4">
        <div className="h-4 w-44 animate-pulse rounded bg-border/80" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-border/80" />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center justify-between px-5 py-5">
          <div className="space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-border/80" />
            <div className="h-3 w-56 animate-pulse rounded bg-border/80" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-border/80" />
        </div>
      ))}
    </div>
  );
}
