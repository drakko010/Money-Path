"use client";

import type { ReactNode } from "react";
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconInfo, IconX } from "@/components/icons";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  onClose?: () => void;
  action?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<AlertVariant, { box: string; icon: string }> = {
  info: { box: "border-info/25 bg-info-soft", icon: "text-info" },
  success: { box: "border-success/25 bg-success-soft", icon: "text-success" },
  warning: { box: "border-warning/25 bg-warning-soft", icon: "text-warning" },
  danger: { box: "border-danger/25 bg-danger-soft", icon: "text-danger" },
};

function VariantIcon({ variant }: { variant: AlertVariant }) {
  const size = 17;
  if (variant === "success") return <IconCheck size={size} />;
  if (variant === "warning") return <IconAlertTriangle size={size} />;
  if (variant === "danger") return <IconAlertCircle size={size} />;
  return <IconInfo size={size} />;
}

/** Alerta contextual embutido na página. */
export function Alert({
  variant = "info",
  title,
  description,
  onClose,
  action,
  className = "",
}: AlertProps) {
  const styles = VARIANT_CLASSES[variant];

  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border p-4 ${styles.box} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 ${styles.icon}`}>
        <VariantIcon variant={variant} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          aria-label="Cerrar alerta"
          onClick={onClose}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/60 hover:text-text"
        >
          <IconX size={14} />
        </button>
      ) : null}
    </div>
  );
}
