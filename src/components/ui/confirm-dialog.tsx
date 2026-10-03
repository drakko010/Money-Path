"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  icon?: ReactNode;
}

/** Diálogo de confirmação para ações destrutivas ou importantes. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "primary",
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <div className="flex flex-col items-start gap-3 py-1">
        {icon ? (
          <span
            className={`grid h-11 w-11 place-items-center rounded-xl ${
              tone === "danger"
                ? "bg-danger-soft text-danger"
                : "bg-primary-50 text-primary-700"
            }`}
          >
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="font-display text-base font-semibold text-text">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        <div className="mt-2 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
