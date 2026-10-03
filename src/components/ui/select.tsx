"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { IconAlertCircle, IconChevronDown } from "@/components/icons";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Slot opcional à esquerda (ex.: ícone). */
  leading?: ReactNode;
}

/** Select nativo estilizado (acessível e ideal para mobile). */
export function Select({
  label,
  hint,
  error,
  leading,
  className = "",
  id,
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={selectId} className="text-xs font-bold text-text">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <div
          className={`flex h-10 items-center rounded-xl border bg-surface transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 ${
            error ? "border-danger" : "border-border-strong"
          }`}
        >
          {leading ? <span className="pl-3 text-faint">{leading}</span> : null}
          <select
            id={selectId}
            aria-invalid={error ? true : undefined}
            className="w-full appearance-none bg-transparent py-0 pl-3 pr-9 text-sm text-text outline-none"
            {...rest}
          >
            {children}
          </select>
        </div>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
        />
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <IconAlertCircle size={13} />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}
