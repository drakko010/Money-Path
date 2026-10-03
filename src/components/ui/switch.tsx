"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}

/** Interruptor liga/desliga. */
export function Switch({
  label,
  description,
  className = "",
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  onChange,
  disabled,
  ...rest
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const [internal, setInternal] = useState(Boolean(defaultChecked));
  const isChecked = checked ?? internal;

  return (
    <label
      htmlFor={switchId}
      className={`flex cursor-pointer items-center justify-between gap-4 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
    >
      {(label || description) && (
        <span className="flex min-w-0 flex-col gap-0.5">
          {label ? <span className="text-sm font-semibold text-text">{label}</span> : null}
          {description ? <span className="text-xs text-muted">{description}</span> : null}
        </span>
      )}
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          id={switchId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(event) => {
            setInternal(event.target.checked);
            onCheckedChange?.(event.target.checked);
            onChange?.(event);
          }}
          className="peer sr-only"
          aria-checked={isChecked}
          {...rest}
        />
        <span
          aria-hidden
          className={`h-6 w-10 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-200 ${
            isChecked ? "bg-primary" : "bg-border-strong"
          }`}
        />
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-elevated shadow-sm transition-transform ${
            isChecked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </label>
  );
}
