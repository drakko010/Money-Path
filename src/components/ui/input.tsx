"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { IconAlertCircle } from "@/components/icons";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
  rightElement?: ReactNode;
}

/** Campo de texto com rótulo, dica, erro e adornos. */
export function Input({
  label,
  hint,
  error,
  iconLeft,
  rightElement,
  className = "",
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="text-xs font-bold text-text">
          {label}
        </label>
      ) : null}
      <div
        className={`flex h-10 items-center gap-2 rounded-xl border bg-surface px-3 transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 ${
          error ? "border-danger" : "border-border-strong"
        }`}
      >
        {iconLeft ? <span className="text-faint">{iconLeft}</span> : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
          {...rest}
        />
        {rightElement}
      </div>
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs font-medium text-danger"
        >
          <IconAlertCircle size={13} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
