import Link from "next/link";
import { Suspense } from "react";
import {
  FoundationStatus,
  FoundationStatusSkeleton,
} from "@/components/foundation-status";
import { ModuleMap } from "@/components/module-map";
import { Roadmap } from "@/components/roadmap";
import { Wordmark } from "@/components/wordmark";
import { getCurrencyConfig, getLocaleConfig } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export default function HomePage() {
  const dict = getDictionary();
  const locale = getLocaleConfig();
  const currency = getCurrencyConfig();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen">
      {/* ── Barra superior ─────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Wordmark />
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-muted md:inline-flex">
              {dict.topbar.region}: {locale.code}
            </span>
            <span className="hidden rounded-full border border-border bg-surface px-3 py-1.5 text-muted md:inline-flex">
              {dict.topbar.currency}: {currency.code}
            </span>
            <Link
              href="/design"
              className="rounded-full border border-primary-200 bg-primary-soft px-3 py-1.5 text-primary-700 transition-colors hover:bg-primary-100"
            >
              Design System
            </Link>
            <Link
              href="/app"
              className="rounded-full bg-primary-700 px-3 py-1.5 text-primary-50 transition-colors hover:bg-primary-hover"
            >
              Entrar a la app
            </Link>
            <span className="hidden rounded-full border border-primary-200 px-3 py-1.5 text-primary-700 sm:inline-flex">
              {dict.topbar.stage}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* ── Hero: posicionamiento + panel de verificación ───────────── */}
        <section className="grid gap-10 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
              {dict.hero.kicker}
            </p>
            <h1 className="mt-4 font-display text-[clamp(1.9rem,4.6vw,3.3rem)] font-bold leading-[1.05] tracking-tight text-primary-950">
              {dict.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              {dict.hero.intro}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-faint">
                  {dict.hero.fromLabel}
                </span>
                {dict.hero.from.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-accent-500">
                <ArrowRightIcon className="h-4 w-4 rotate-90 sm:rotate-0" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-faint">
                  {dict.hero.toLabel}
                </span>
                {dict.hero.to.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-primary-200 bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Suspense fallback={<FoundationStatusSkeleton />}>
            <FoundationStatus />
          </Suspense>
        </section>

        {/* ── Módulos planificados ─────────────────────────────────────── */}
        <div className="py-10">
          <ModuleMap />
        </div>

        {/* ── Ruta de desarrollo ───────────────────────────────────────── */}
        <div className="py-10">
          <Roadmap />
        </div>
      </main>

      {/* ── Diferenciales ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="differentiators-title"
        className="mt-6 bg-primary-950 text-background"
      >
        <div className="mx-auto max-w-6xl px-5 py-14">
          <header className="max-w-2xl">
            <h2
              id="differentiators-title"
              className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {dict.differentiators.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-primary-200">
              {dict.differentiators.subtitle}
            </p>
          </header>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-primary-800 bg-primary-900 p-6">
              <p className="font-display text-lg font-bold text-accent-300">
                {dict.differentiators.path.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-primary-100">
                {dict.differentiators.path.desc}
              </p>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-primary-200">
                <ArrowRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
                {dict.differentiators.path.note}
              </p>
            </article>

            <article className="rounded-2xl border border-primary-800/80 bg-transparent p-6">
              <p className="font-display text-lg font-bold text-background">
                {dict.differentiators.ai.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-primary-100">
                {dict.differentiators.ai.desc}
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary-900/70 p-3 text-xs leading-relaxed text-accent-300">
                <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {dict.differentiators.ai.disclaimer}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Pie ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="max-w-3xl text-sm leading-relaxed text-muted">
            {dict.footer.principle}
          </p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <span>{dict.footer.builtFor}</span>
            <span>
              {dict.footer.stageNote} · {year} · {dict.meta.tagline}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
