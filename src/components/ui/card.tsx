import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "elevated" | "outline";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "border border-border bg-surface shadow-card",
  elevated: "border border-border bg-elevated shadow-elevated",
  outline: "border border-border-strong bg-surface",
};

/** Container de conteúdo com bordas discretas e sombra sutil. */
export function Card({ variant = "default", className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-border/70 px-5 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`font-display text-base font-semibold text-text ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`mt-1 text-xs text-muted ${className}`}>{children}</p>;
}

export function CardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-t border-border/70 px-5 py-3.5 ${className}`}>
      {children}
    </div>
  );
}
