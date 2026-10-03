import Link from "next/link";
import { IconRoute } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import { getDictionary } from "@/lib/i18n";

/** Ruta inexistente fuera del aplicativo: 404 global. */
export default function GlobalNotFound() {
  const dict = getDictionary();

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-card">
        <Wordmark />
        <span className="mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-700">
          <IconRoute size={26} />
        </span>
        <p className="mt-5 font-display text-4xl font-bold tracking-tight text-primary-950">
          {dict.notFound.code}
        </p>
        <h1 className="mt-2 font-display text-lg font-semibold text-text">
          {dict.notFound.title}
        </h1>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
          {dict.notFound.description}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-50 shadow-sm transition-colors hover:bg-primary-hover"
          >
            {dict.notFound.backApp}
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-text shadow-sm transition-colors hover:bg-elevated"
          >
            {dict.notFound.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
