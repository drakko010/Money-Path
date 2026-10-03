"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/icons";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/** Modal centralizado com overlay, Escape e clique fora para fechar. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-primary-950/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className={`pointer-events-auto w-full animate-scale-in rounded-2xl border border-border bg-elevated shadow-overlay outline-none ${SIZE_CLASSES[size]}`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
            <div>
              {title ? (
                <h2 className="font-display text-base font-semibold text-text">{title}</h2>
              ) : null}
              {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => onOpenChange(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-background hover:text-text"
            >
              <IconX size={16} />
            </button>
          </header>
          {children ? <div className="px-5 py-4">{children}</div> : null}
          {footer ? (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-5 py-3.5">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
