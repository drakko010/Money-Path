"use client";

import { useId } from "react";

export interface SliderProps {
  label?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Mostrar o valor atual à direita do rótulo. */
  showValue?: boolean;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

/** Controle deslizante com trilha preenchida. */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = false,
  formatValue,
  disabled = false,
  className = "",
}: SliderProps) {
  const id = useId();
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`flex flex-col gap-2 ${disabled ? "opacity-50" : ""} ${className}`}>
      {label || showValue ? (
        <div className="flex items-center justify-between">
          {label ? (
            <label htmlFor={id} className="text-xs font-bold text-text">
              {label}
            </label>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="font-display text-xs font-semibold tabular-nums text-primary-700">
              {formatValue ? formatValue(value) : value}
            </span>
          ) : null}
        </div>
      ) : null}
      <input
        type="range"
        id={id}
        className="mp-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percent}%, var(--color-border-strong) ${percent}%)`,
        }}
      />
    </div>
  );
}
