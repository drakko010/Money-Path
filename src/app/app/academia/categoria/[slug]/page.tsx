import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { AcademyCategoryIcon, AcademyKindIcon } from "@/components/academia/academy-icons";
import { AcademyFiltersBar } from "@/components/academia/academy-filters";
import { AcademyContentCardView } from "@/components/academia/content-card";
import { AcademyTabs } from "@/components/academia/academy-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { getSession } from "@/lib/auth";
import { getAcademyCategoryData, type AcademySearchParams } from "@/lib/academy";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AcademiaCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<AcademySearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const filters = await searchParams;
  const data = await getAcademyCategoryData(session.user.id, slug, filters);
  if (!data) notFound();

  const dict = getDictionary();
  const { category } = data;

  return (
    <PageShell navId="academia" active>
      <AcademyTabs active="explore" />

      <Link
        href="/app/academia"
        className="text-xs font-bold text-primary-700 hover:text-primary-hover"
      >
        ← {dict.academy.category.back}
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-700">
              <AcademyCategoryIcon iconKey={category.icon} size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-primary-950">{category.name}</h2>
              {category.description ? (
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted">
                  {category.description}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                {dict.academy.category.meta.replace("{total}", String(category.totalContents))} ·{" "}
                {category.completedContents}/{category.totalContents}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-56">
            <Progress
              value={category.progressPct}
              label={dict.academy.category.progressLabel}
              showValue
              tone="success"
            />
          </div>
        </CardContent>
      </Card>

      <AcademyFiltersBar
        filters={data.filters}
        kinds={data.availableKinds}
        levels={data.availableLevels}
        resultCount={data.contents.length}
        totalCount={category.totalContents}
        basePath={`/app/academia/categoria/${category.slug}`}
      />

      {data.contents.length === 0 ? (
        <EmptyState
          icon={<AcademyKindIcon kind="short" size={20} />}
          title={category.name}
          description={
            category.totalContents === 0
              ? dict.academy.category.empty
              : dict.academy.category.emptyFilters
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.contents.map((card) => (
            <AcademyContentCardView key={card.id} card={card} showReview />
          ))}
        </div>
      )}
    </PageShell>
  );
}
