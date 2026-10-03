import { IconSpinner } from "@/components/icons";

export interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Indicador de progresso indeterminado. */
export function Spinner({ size = 18, className = "" }: SpinnerProps) {
  return <IconSpinner size={size} className={`animate-spin text-primary-600 ${className}`} />;
}

/** Bloco de esqueleto para conteúdo em carregamento. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-border/70 ${className}`} />;
}

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Estado de carregamento de seção inteira. */
export function LoadingState({ label = "Cargando…", className = "" }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 ${className}`}
    >
      <Spinner size={22} />
      <p className="text-xs font-semibold text-muted">{label}</p>
    </div>
  );
}
