"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { IconAlertCircle, IconAlertTriangle, IconCheck, IconInfo, IconX } from "@/components/icons";

export type ToastVariant = "default" | "success" | "danger" | "warning" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Tempo em ms até fechar automaticamente (padrão 4500). */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "title">> {
  id: number;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return context;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: ReactNode; accent: string }> = {
  default: { icon: <IconInfo size={16} />, accent: "text-primary-600" },
  success: { icon: <IconCheck size={16} />, accent: "text-success" },
  danger: { icon: <IconAlertCircle size={16} />, accent: "text-danger" },
  warning: { icon: <IconAlertTriangle size={16} />, accent: "text-warning" },
  info: { icon: <IconInfo size={16} />, accent: "text-info" },
};

/** Provedor de toasts — monte uma única vez no layout raiz. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((current) => [
        ...current.slice(-3),
        {
          id,
          title: options.title,
          description: options.description,
          variant: options.variant ?? "default",
        },
      ]);
      window.setTimeout(() => dismiss(id), options.duration ?? 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div
              aria-live="polite"
              className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
            >
              {toasts.map((item) => {
                const styles = VARIANT_STYLES[item.variant];
                return (
                  <div
                    key={item.id}
                    role="status"
                    className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border border-border bg-elevated p-4 shadow-elevated"
                  >
                    <span className={`mt-0.5 shrink-0 ${styles.accent}`}>{styles.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar notificación"
                      onClick={() => dismiss(item.id)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-background hover:text-text"
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
