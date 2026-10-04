"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}

/** Caixa de seleção com rótulo e descrição opcionais. */
export function Checkbox({
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
}: CheckboxProps) {
  const autoId = useId();
  const checkboxId = id ?? autoId;
  const [internal, setInternal] = useState(Boolean(defaultChecked));
  const isChecked = checked ?? internal;

  return (
    <label
      htmlFor={checkboxId}
      className={`flex cursor-pointer items-start gap-3 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${className}`}
    >
      <span className="relative mt-0.5 inline-flex">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(event) => {
            setInternal(event.target.checked);
            onCheckedChange?.(event.target.checked);
            onChange?.(event);
          }}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden
          className={`grid h-5 w-5 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary-200 ${
            isChecked
              ? "border-primary bg-primary text-primary-50"
              : "border-border-strong bg-surface text-transparent"
          }`}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label ? <span className="text-sm font-semibold text-text">{label}</span> : null}
          {description ? <span className="text-xs text-muted">{description}</span> : null}
        </span>
      )}
    </label>
  );
}
