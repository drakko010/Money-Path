import { MODULES, type ModuleStatus } from "@/config/modules";
import { getDictionary } from "@/lib/i18n";

const STATUS_CHIP: Record<ModuleStatus, string> = {
  planificado: "border-border bg-background text-faint",
  en_desarrollo: "border-warning/25 bg-warning-soft text-warning-strong",
  disponible: "border-success/25 bg-success-soft text-success-strong",
};

/**
 * Mapa de capacidades planificadas de Money Path.
 * Los textos salen del diccionario de i18n; la estructura, de `MODULES`.
 */
export function ModuleMap() {
  const dict = getDictionary();

  return (
    <section aria-labelledby="modules-title">
      <header className="max-w-2xl">
        <h2
          id="modules-title"
          className="font-display text-2xl font-semibold tracking-tight text-primary-900 sm:text-3xl"
        >
          {dict.modules.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {dict.modules.subtitle}
        </p>
      </header>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module, index) => {
          const texts =
            dict.modules.items[module.id as keyof typeof dict.modules.items];
          if (!texts) return null;

          return (
            <li
              key={module.id}
              className="group rounded-xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-sm font-semibold tabular-nums text-accent-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_CHIP[module.status]}`}
                >
                  {dict.modules.status[module.status]}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-text">{texts.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-faint">
                {texts.desc}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
