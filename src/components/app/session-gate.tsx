"use client";

import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useSession } from "@/lib/auth-client";
import { getDictionary } from "@/lib/i18n";

/**
 * Guard de sesión del aplicativo.
 *
 * Se usa cuando el servidor no vio cookie (p. ej. cuando el navegador
 * bloquea cookies de terceros en el preview embebido): verifica la sesión
 * por el cliente —funciona con cookie o con el token Bearer guardado en
 * localStorage—. Sin sesión, redirige a `/login`.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const dict = getDictionary();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !data) {
      window.location.href = "/login";
    }
  }, [isPending, data]);

  if (isPending || !data) {
    return <LoadingState label={dict.loadingScreen.title} className="mt-6" />;
  }

  return <>{children}</>;
}
