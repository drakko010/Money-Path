import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDictionary } from "@/lib/i18n";
import type { AcademyContentCard } from "@/lib/academy";
import { AcademyKindIcon } from "./academy-icons";
import { FavoriteButton } from "./favorite-button";

const KIND_TONE = {
  guide: "primary",
  article: "info",
  lesson: "accent",
  short: "neutral",
  video: "warning",
} as const;

/**
 * Tarjeta de contenido de la Academia. Se usa en el inicio, en las categorías
 * y en Mi progreso; `progress` muestra el avance del usuario cuando existe.
 */
export function AcademyContentCardView({
  card,
  progress = true,
  showReview = false,
}: {
  card: AcademyContentCard;
  progress?: boolean;
  /** Muestra el estado de revisión editorial (transparencia del contenido base). */
  showReview?: boolean;
}) {
  const dict = getDictionary();
  const kindLabel = dict.academy.kinds[card.kind as keyof typeof dict.academy.kinds] ?? card.kind;
  const levelLabel = dict.academy.levels[card.level as keyof typeof dict.academy.levels] ?? card.level;

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
          <AcademyKindIcon kind={card.kind} size={13} />
          {kindLabel}
        </span>
        <FavoriteButton slug={card.slug} isFavorite={card.isFavorite} />
      </div>

      <Link href={`/app/academia/contenido/${card.slug}`} className="mt-2 block">
        <h3 className="font-display text-sm font-bold leading-snug text-text hover:text-primary-700">
          {card.title}
        </h3>
      </Link>

      {card.summary ? (
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{card.summary}</p>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-3">
        {progress && card.progressPct > 0 ? (
          <Progress value={card.progressPct} size="sm" tone={card.status === "completed" ? "success" : "primary"} showValue />
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={KIND_TONE[card.kind as keyof typeof KIND_TONE] ?? "neutral"}>
            {levelLabel}
          </Badge>
          <Badge tone="outline">
            {card.durationMinutes
              ? dict.academy.content.minutes.replace("{minutes}", String(card.durationMinutes))
              : dict.academy.content.noDuration}
          </Badge>
          {card.status === "completed" ? (
            <Badge tone="success" dot>
              {dict.academy.content.completed}
            </Badge>
          ) : null}
          {card.status === "in_progress" ? (
            <Badge tone="primary" dot>
              {dict.academy.filters.inProgress}
            </Badge>
          ) : null}
          {showReview ? (
            <Badge tone={card.reviewStatus === "reviewed" ? "success" : "warning"}>
              {card.reviewStatus === "reviewed"
                ? dict.academy.review.reviewed
                : dict.academy.review.pendingShort}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
