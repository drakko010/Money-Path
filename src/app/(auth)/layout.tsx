import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/wordmark";
import { getDictionary } from "@/lib/i18n";

/** Layout das páginas públicas de autenticación. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const dict = getDictionary();

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Link href="/" aria-label="Money Path">
            <Wordmark />
          </Link>
        </div>
        <main className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
          {children}
        </main>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-faint transition-colors hover:text-primary-700"
          >
            {dict.auth.backToSite}
          </Link>
        </p>
      </div>
    </div>
  );
}
