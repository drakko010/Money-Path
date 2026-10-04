export type ProgressTone = "primary" | "success" | "warning" | "danger" | "accent";
export type ProgressSize = "sm" | "md";

export interface ProgressProps {
  /** Valor entre 0 e 100. */
  value: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  label?: string;
  showValue?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent-500",
};

/** Barra de progresso linear. */
export function Progress({
  value,
  tone = "primary",
  size = "md",
  label,
  showValue = false,
  className = "",
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label || showValue ? (
        <div className="flex items-center justify-between">
          {label ? <span className="text-xs font-bold text-text">{label}</span> : <span />}
          {showValue ? (
            <span className="font-display text-xs font-semibold tabular-nums text-muted">
              {Math.round(clamped)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={`w-full overflow-hidden rounded-full bg-primary-50 ring-1 ring-inset ring-border/60 ${
          size === "sm" ? "h-1.5" : "h-2.5"
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${TONE_CLASSES[tone]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
