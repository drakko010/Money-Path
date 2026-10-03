import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "outline";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border bg-background text-muted",
  primary: "border-primary-100 bg-primary-50 text-primary-700",
  success: "border-success/20 bg-success-soft text-success-strong",
  warning: "border-warning/20 bg-warning-soft text-warning-strong",
  danger: "border-danger/20 bg-danger-soft text-danger-strong",
  info: "border-info/20 bg-info-soft text-info-strong",
  accent: "border-accent-200 bg-accent-100 text-accent-600",
  outline: "border-border-strong bg-transparent text-muted",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-faint",
  primary: "bg-primary-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent-500",
  outline: "bg-faint",
};

/** Badge para estados, categorias e rótulos curtos. */
export function Badge({ tone = "neutral", dot = false, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot ? (
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      ) : null}
      {children}
    </span>
  );
}
