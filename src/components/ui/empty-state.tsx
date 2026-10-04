import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Estado vazio: orienta o primeiro passo do usuário. */
export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-10 text-center ${className}`}
    >
      {icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary-600">
          {icon}
        </span>
      ) : null}
      <p className="mt-3 font-display text-sm font-semibold text-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
