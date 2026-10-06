import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { AcademyCategoryIcon, AcademyKindIcon } from "@/components/academia/academy-icons";
import { AcademyContentCardView } from "@/components/academia/content-card";
import { AcademyFiltersBar } from "@/components/academia/academy-filters";
import { AcademyTabs } from "@/components/academia/academy-tabs";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { getSession } from "@/lib/auth";
import { getAcademyHomeData, type AcademySearchParams } from "@/lib/academy";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Academia — Money Path",
};

export default async function AcademiaPage({
  searchParams,
}: {
  searchParams: Promise<AcademySearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const data = await getAcademyHomeData(session.user.id, params);
  const dict = getDictionary();

  if (!data.ready) {
    return (
      <PageShell navId="academia" active>
        <AcademyTabs active="explore" />
        <EmptyState
          icon={<AcademyKindIcon kind="guide" size={20} />}
          title={dict.academy.home.catalogTitle}
          description={dict.academy.home.notReady}
        />
      </PageShell>
    );
  }

  const { stats } = data;

  return (
    <PageShell navId="academia" active>
      <AcademyTabs active="explore" />

      <Alert variant="info" title={dict.academy.review.notice} />

      {/* Progreso del usuario */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{dict.academy.progress.title}</CardTitle>
          <span className="text-xs text-faint">
            {stats.completed} {dict.academy.progress.ofCatalog.replace("{total}", String(stats.total))}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress
            value={stats.completedPct}
            label={dict.academy.progress.percent}
            showValue
            tone="success"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: dict.academy.progress.completed, value: stats.completed, tone: "text-success-strong" },
              { label: dict.academy.progress.inProgress, value: stats.inProgress, tone: "text-primary-700" },
              { label: dict.academy.progress.favorites, value: stats.favorites, tone: "text-accent-600" },
              { label: dict.academy.progress.pending, value: stats.pending, tone: "text-muted" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                  {item.label}
                </p>
                <p className={`mt-1 font-display text-xl font-bold tabular-nums ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {stats.completed + stats.inProgress === 0 ? (
            <p className="text-xs leading-relaxed text-muted">{dict.academy.progress.empty}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Continúa donde lo dejaste / empieza por aquí */}
      {data.continueContent ? (
        <Card variant="elevated" className="border-primary-200 bg-primary-50/40">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-50">
                <AcademyKindIcon kind={data.continueContent.kind} size={18} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary-700">
                  {data.continueContent.status === "in_progress"
                    ? dict.academy.home.continueTitle
                    : dict.academy.home.startTitle}
                </p>
                <h2 className="mt-0.5 font-display text-base font-bold text-primary-950">
                  {data.continueContent.title}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {data.continueContent.categoryName} ·{" "}
                  {dict.academy.kinds[
                    data.continueContent.kind as keyof typeof dict.academy.kinds
                  ] ?? data.continueContent.kind}
                </p>
              </div>
            </div>
            <Link href={`/app/academia/contenido/${data.continueContent.slug}`}>
              <Button
                variant="primary"
                size="md"
                iconRight={<AcademyKindIcon kind="lesson" size={14} />}
              >
                {data.continueContent.status === "in_progress"
                  ? dict.academy.home.continueCta
                  : dict.academy.home.startCta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Destacados */}
      {data.featured.length > 0 ? (
        <section aria-label={dict.academy.home.featuredTitle} className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
            {dict.academy.home.featuredTitle}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data.featured.map((card) => (
              <AcademyContentCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Categorías */}
      <section aria-label={dict.academy.home.categoriesTitle} className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
          {dict.academy.home.categoriesTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((category) => (
            <Link
              key={category.id}
              href={`/app/academia/categoria/${category.slug}`}
              className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-elevated"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-700">
                <AcademyCategoryIcon iconKey={category.icon} size={18} />
              </span>
              <h3 className="mt-3 font-display text-sm font-bold text-text">{category.name}</h3>
              {category.description ? (
                <p className="mt-1 text-xs leading-relaxed text-muted">{category.description}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                <Progress value={category.progressPct} size="sm" tone="primary" />
                <span className="text-[11px] text-faint">
                  {dict.academy.home.categoryMeta
                    .replace("{total}", String(category.totalContents))
                    .replace("{completed}", String(category.completedContents))}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Catálogo con filtros */}
      <section aria-label={dict.academy.home.catalogTitle} className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-faint">
          {dict.academy.home.catalogTitle}
        </h2>
        <AcademyFiltersBar
          filters={data.filters}
          kinds={data.availableKinds}
          levels={data.availableLevels}
          resultCount={data.results.length}
          totalCount={data.catalog.length}
          basePath="/app/academia"
        />
        {data.results.length === 0 ? (
          <EmptyState
            icon={<AcademyKindIcon kind="short" size={20} />}
            title={dict.academy.home.catalogTitle}
            description={dict.academy.home.emptyResults}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.results.map((card) => (
              <AcademyContentCardView key={card.id} card={card} showReview />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
