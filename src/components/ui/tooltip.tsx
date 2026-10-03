"use client";

import { useId, type ReactNode } from "react";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** Tooltip leve por hover/foco (CSS-first, sem dependências). */
export function Tooltip({ content, children, side = "top", className = "" }: TooltipProps) {
  const id = useId();

  return (
    <span
      className={`group relative inline-flex focus-within:outline-none ${className}`}
      aria-describedby={id}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 w-max max-w-56 -translate-x-1/2 rounded-lg bg-primary-950 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-primary-50 opacity-0 shadow-elevated transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {content}
      </span>
    </span>
  );
}
