"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconRefresh, IconSpinner } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { ACADEMY_PROGRESS_STEPS } from "@/lib/academy-shared";
import { getDictionary } from "@/lib/i18n";
import { FavoriteButton } from "./favorite-button";

type Op = "setProgress" | "complete" | "reset" | "open";

/**
 * Acciones de progreso del contenido (Etapa 19): avance por pasos, concluir,
 * reiniciar y favorito. El avance se guarda por usuario en el servidor; la UI
 * refleja el estado optimista y refresca los datos al confirmar.
 */
export function AcademyContentActions({
  slug,
  initialPct,
  initialFavorite,
  showSteps,
}: {
  slug: string;
  initialPct: number;
  initialFavorite: boolean;
  /** Los pasos intermedios solo aplican a guías y aulas. */
  showSteps: boolean;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [pct, setPct] = useState(initialPct);
  const [saving, setSaving] = useState(false);

  // Al abrir un contenido que ya tiene avance, se actualiza la última visita
  // (op `open`): así "Continúa donde lo dejaste" apunta al más reciente.
  useEffect(() => {
    if (initialPct <= 0) return;
    void fetch("/api/academia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "open", slug }),
    }).catch(() => undefined);
  }, [initialPct, slug]);

  async function send(op: Op, nextPct?: number) {
    if (saving) return;
    const previous = pct;
    if (op === "complete") setPct(100);
    if (op === "reset") setPct(0);
    if (op === "setProgress" && typeof nextPct === "number") setPct(nextPct);
    setSaving(true);
    try {
      const response = await fetch("/api/academia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, slug, pct: nextPct }),
      });
      if (!response.ok) {
        setPct(previous);
        toast({ title: dict.academy.errors.invalid, variant: "danger" });
        return;
      }
      const data = (await response.json()) as { progressPct: number };
      setPct(data.progressPct);
      toast({
        title: op === "reset" ? dict.academy.content.markPending : dict.academy.content.saved,
        variant: "success",
      });
      router.refresh();
    } catch {
      setPct(previous);
      toast({ title: dict.academy.errors.generic, variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  const completed = pct >= 100;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-faint">
            {dict.academy.content.progressLabel}
          </span>
          <Badge tone={completed ? "success" : pct > 0 ? "primary" : "neutral"} dot>
            {completed
              ? dict.academy.content.completed
              : pct > 0
                ? `${pct}%`
                : dict.academy.filters.pending}
          </Badge>
        </div>
        <FavoriteButton slug={slug} isFavorite={initialFavorite} size="md" withLabel />
      </div>

      <Progress value={pct} tone={completed ? "success" : "primary"} showValue />

      {showSteps ? (
        <div className="flex flex-wrap gap-2">
          {ACADEMY_PROGRESS_STEPS.map((step) => {
            const active = pct === step;
            return (
              <button
                key={step}
                type="button"
                disabled={saving}
                onClick={() => send("setProgress", step)}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                  active
                    ? "border-primary bg-primary text-primary-50"
                    : "border-border bg-surface text-muted hover:border-primary-300 hover:text-primary-700"
                }`}
              >
                {step}%
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted">{dict.academy.content.progressHint}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => send(completed ? "reset" : "complete")}
          variant={completed ? "secondary" : "primary"}
          size="sm"
          loading={saving}
          iconLeft={completed ? <IconRefresh size={14} /> : <IconCheck size={14} />}
        >
          {completed ? dict.academy.content.markPending : dict.academy.content.markComplete}
        </Button>
      </div>

      {saving ? (
        <span className="flex items-center gap-1.5 text-[11px] text-faint">
          <IconSpinner size={12} className="animate-spin" />
          {dict.academy.content.saved}
        </span>
      ) : null}
    </div>
  );
}
