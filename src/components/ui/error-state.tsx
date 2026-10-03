"use client";

import { IconAlertTriangle, IconRefresh } from "@/components/icons";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Estado de erro com ação de reintento. */
export function ErrorState({
  title = "Ocurrió un error",
  description = "No pudimos completar la operación. Intenta de nuevo.",
  onRetry,
  retryLabel = "Reintentar",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center rounded-2xl border border-danger/25 bg-danger-soft/60 px-6 py-10 text-center ${className}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
        <IconAlertTriangle size={20} />
      </span>
      <p className="mt-3 font-display text-sm font-semibold text-text">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          iconLeft={<IconRefresh size={14} />}
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
