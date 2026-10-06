import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { AcademyCategoryIcon, AcademyKindIcon } from "@/components/academia/academy-icons";
import { AcademyContentCardView } from "@/components/academia/content-card";
import { AcademyTabs } from "@/components/academia/academy-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { getSession } from "@/lib/auth";
import { getAcademyProgressData, type AcademyContentCard } from "@/lib/academy";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi progreso — Academia — Money Path",
};

export default async function AcademiaProgressPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getAcademyProgressData(session.user.id);
  const dict = getDictionary();

  const sections: {
    id: string;
    title: string;
    empty: string;
    items: AcademyContentCard[];
  }[] = [
    {
      id: "completed",
      title: dict.academy.myProgress.completedTitle,
      empty: dict.academy.myProgress.emptyCompleted,
      items: data.completed,
    },
    {
      id: "in-progress",
      title: dict.academy.myProgress.inProgressTitle,
      empty: dict.academy.myProgress.emptyInProgress,
      items: data.inProgress,
    },
    {
      id: "favorites",
      title: dict.academy.myProgress.favoritesTitle,
      empty: dict.academy.myProgress.emptyFavorites,
      items: data.favorites,
    },
    {
      id: "pending",
      title: dict.academy.myProgress.pendingTitle,
      empty: dict.academy.myProgress.emptyPending,
      items: data.pending,
    },
  ];

  return (
    <PageShell navId="academia" active>
      <AcademyTabs active="progress" />

      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        {dict.academy.myProgress.subtitle}
      </p>

      {!data.ready ? (
        <EmptyState
          icon={<AcademyKindIcon kind="guide" size={20} />}
          title={dict.academy.home.catalogTitle}
          description={dict.academy.home.notReady}
        />
      ) : (
        <>
          {/* Resumen */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">{dict.academy.progress.title}</CardTitle>
              <span className="text-xs text-faint">
                {data.stats.completed} {dict.academy.progress.ofCatalog.replace("{total}", String(data.stats.total))}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Progress
                value={data.stats.completedPct}
                label={dict.academy.progress.percent}
                showValue
                tone="success"
              />
              <div className="flex flex-wrap gap-4 text-xs text-muted">
                <span>
                  <strong className="font-display text-sm text-success-strong">{data.stats.completed}</strong>{" "}
                  {dict.academy.progress.completed.toLowerCase()}
                </span>
                <span>
                  <strong className="font-display text-sm text-primary-700">{data.stats.inProgress}</strong>{" "}
                  {dict.academy.progress.inProgress.toLowerCase()}
                </span>
                <span>
                  <strong className="font-display text-sm text-accent-600">{data.stats.favorites}</strong>{" "}
                  {dict.academy.progress.favorites.toLowerCase()}
                </span>
                <span>
                  <strong className="font-display text-sm text-muted">{data.stats.pending}</strong>{" "}
                  {dict.academy.progress.pending.toLowerCase()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Avance por categoría */}
          <section aria-label={dict.academy.myProgress.byCategory} className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
              {dict.academy.myProgress.byCategory}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/app/academia/categoria/${category.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-elevated"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
                    <AcademyCategoryIcon iconKey={category.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-bold text-text">{category.name}</p>
                    <div className="mt-1.5">
                      <Progress value={category.progressPct} size="sm" tone="primary" />
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-xs font-bold tabular-nums text-muted">
                    {category.completedContents}/{category.totalContents}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Listas */}
          {sections.map((section) => (
            <section key={section.id} aria-label={section.title} className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
                {section.title} · {section.items.length}
              </h2>
              {section.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
                  {section.empty}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((card) => (
                    <AcademyContentCardView key={card.id} card={card} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </>
      )}
    </PageShell>
  );
}
