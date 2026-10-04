import { CURRENT_STAGE, STAGES, type StageStatus } from "@/config/roadmap";
import { getDictionary } from "@/lib/i18n";

const STATUS_LABEL_KEY: Record<StageStatus, "completed" | "inProgress" | "planned" | "pending"> = {
  completa: "completed",
  en_curso: "inProgress",
  planificada: "planned",
  por_definir: "pending",
};

const STATUS_CHIP: Record<StageStatus, string> = {
  completa: "border-success/25 bg-success-soft text-success-strong",
  en_curso: "border-accent-300 bg-warning-soft text-warning-strong",
  planificada: "border-border bg-background text-faint",
  por_definir: "border-dashed border-border bg-transparent text-faint",
};

/** Ruta de desarrollo: etapas reales desde `roadmap.ts`, sin texto hardcodeado. */
export function Roadmap() {
  const dict = getDictionary();

  return (
    <section aria-labelledby="roadmap-title">
      <header className="max-w-2xl">
        <h2
          id="roadmap-title"
          className="font-display text-2xl font-semibold tracking-tight text-primary-900 sm:text-3xl"
        >
          {dict.roadmap.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {dict.roadmap.subtitle}
        </p>
      </header>

      <ol className="mt-8 space-y-3">
        {STAGES.map((stage) => {
          const isCurrent = stage.id === CURRENT_STAGE;
          const stageText = dict.roadmap.stages[`s${stage.id}` as "s0"];

          return (
            <li
              key={stage.id}
              className={`flex flex-col gap-3 rounded-xl border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between ${
                isCurrent ? "border-primary-300 bg-surface" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${
                    isCurrent
                      ? "bg-primary-700 text-accent-200"
                      : "bg-background text-muted"
                  }`}
                >
                  {stage.id}
                </span>
                <div>
                  <p className="text-sm font-bold text-text">
                    {dict.roadmap.stage} {stage.id} ·{" "}
                    {stageText ? stageText.title : "—"}
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-faint">
                    {stageText ? stageText.desc : ""}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CHIP[stage.status]}`}
              >
                {dict.roadmap[STATUS_LABEL_KEY[stage.status]]}
                {isCurrent ? ` · ${dict.roadmap.current}` : ""}
              </span>
            </li>
          );
        })}

        <li className="flex flex-col gap-3 rounded-xl border border-dashed border-border-strong p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-dashed border-border-strong font-display text-sm font-bold text-faint">
              1+
            </span>
            <div>
              <p className="text-sm font-bold text-muted">
                {dict.roadmap.upcomingTitle}
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-faint">
                {dict.roadmap.upcomingDesc}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-bold text-faint">
            {dict.roadmap.pending}
          </span>
        </li>
      </ol>
    </section>
  );
}
