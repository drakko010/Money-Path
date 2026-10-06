"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSpinner } from "@/components/icons";
import { getDictionary } from "@/lib/i18n";

/** Corazón de favoritos: botón compacto reutilizable en tarjetas y lector. */
export function FavoriteButton({
  slug,
  isFavorite,
  size = "sm",
  withLabel = false,
}: {
  slug: string;
  isFavorite: boolean;
  size?: "sm" | "md";
  withLabel?: boolean;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [saving, setSaving] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    const next = !favorite;
    setFavorite(next);
    setSaving(true);
    try {
      const response = await fetch("/api/academia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "toggleFavorite", slug }),
      });
      if (!response.ok) {
        setFavorite(!next);
        return;
      }
      router.refresh();
    } catch {
      setFavorite(!next);
    } finally {
      setSaving(false);
    }
  }

  const label = favorite ? dict.academy.content.unfavorite : dict.academy.content.favorite;
  const box = size === "md" ? "h-9 w-9" : "h-8 w-8";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      disabled={saving}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors ${box} ${
        favorite
          ? "border-accent-300 bg-accent-100 text-accent-600"
          : "border-border bg-surface text-faint hover:border-accent-300 hover:text-accent-500"
      } ${withLabel ? "w-auto px-3" : ""}`}
    >
      {saving ? <IconSpinner size={13} className="animate-spin" /> : null}
      <svg
        viewBox="0 0 24 24"
        width={size === "md" ? 17 : 15}
        height={size === "md" ? 17 : 15}
        fill={favorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5Z" />
      </svg>
      {withLabel ? (
        <span className="text-xs font-semibold">{favorite ? dict.academy.content.unfavorite : dict.academy.content.favorite}</span>
      ) : null}
    </button>
  );
}
