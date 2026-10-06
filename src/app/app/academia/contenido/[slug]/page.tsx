import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { AcademyCategoryIcon, AcademyKindIcon } from "@/components/academia/academy-icons";
import { AcademyContentActions } from "@/components/academia/content-actions";
import { AcademyRichText } from "@/components/academia/rich-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getAcademyContentDetail } from "@/lib/academy";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AcademiaContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;
  const data = await getAcademyContentDetail(session.user.id, slug);
  if (!data) notFound();

  const dict = getDictionary();
  const { content } = data;
  const kindLabel = dict.academy.kinds[content.kind as keyof typeof dict.academy.kinds] ?? content.kind;
  const levelLabel = dict.academy.levels[content.level as keyof typeof dict.academy.levels] ?? content.level;
  const showSteps = content.kind === "guide" || content.kind === "lesson";

  return (
    <PageShell navId="academia" active>
      <Link
        href={`/app/academia/categoria/${data.category.slug}`}
        className="text-xs font-bold text-primary-700 hover:text-primary-hover"
      >
        ← {data.category.name}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="flex flex-col gap-5">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary" dot>
                <span className="flex items-center gap-1.5">
                  <AcademyKindIcon kind={content.kind} size={12} />
                  {kindLabel}
                </span>
              </Badge>
              <Badge tone="outline">{levelLabel}</Badge>
              <Badge tone="neutral">
                {content.durationMinutes
                  ? dict.academy.content.minutes.replace("{minutes}", String(content.durationMinutes))
                  : dict.academy.content.noDuration}
              </Badge>
              <Badge tone={content.reviewStatus === "reviewed" ? "success" : "warning"}>
                {content.reviewStatus === "reviewed"
                  ? dict.academy.review.reviewed
                  : dict.academy.review.pending}
              </Badge>
            </div>
            <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-primary-950">
              {content.title}
            </h2>
            {content.summary ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted">{content.summary}</p>
            ) : null}
            <Link
              href={`/app/academia/categoria/${data.category.slug}`}
              className="flex w-fit items-center gap-2 text-xs font-bold text-primary-700 hover:text-primary-hover"
            >
              <AcademyCategoryIcon iconKey={data.category.icon} size={14} />
              {data.category.name}
            </Link>
          </header>

          <Card>
            <CardContent>
              <AcademyRichText body={content.body} />
            </CardContent>
          </Card>

          {/* Fuentes y revisión */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{dict.academy.content.sources}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {content.sources ? (
                <p className="text-xs leading-relaxed text-muted">
                  {dict.academy.content.sourcesListed} {content.sources}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  {dict.academy.content.sourcesPending}
                </p>
              )}
              <p className="text-xs leading-relaxed text-faint">{dict.academy.review.disclaimer}</p>
            </CardContent>
          </Card>

          {/* Navegación dentro de la categoría */}
          <nav className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between">
            {data.previous ? (
              <Link
                href={`/app/academia/contenido/${data.previous.slug}`}
                className="flex flex-1 flex-col gap-1 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-elevated"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                  ← {dict.academy.content.previous}
                </span>
                <span className="font-display text-sm font-bold text-text">
                  {data.previous.title}
                </span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {data.next ? (
              <Link
                href={`/app/academia/contenido/${data.next.slug}`}
                className="flex flex-1 flex-col items-end gap-1 rounded-2xl border border-border bg-surface p-4 text-right shadow-card transition-shadow hover:shadow-elevated"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
                  {dict.academy.content.next} →
                </span>
                <span className="font-display text-sm font-bold text-text">{data.next.title}</span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
          </nav>
        </article>

        {/* Acciones */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <AcademyContentActions
            slug={content.slug}
            initialPct={content.progressPct}
            initialFavorite={content.isFavorite}
            showSteps={showSteps}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{dict.academy.content.inCategory}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {data.siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  href={`/app/academia/contenido/${sibling.slug}`}
                  aria-current={sibling.slug === content.slug ? "page" : undefined}
                  className={`flex items-start gap-2 text-xs leading-relaxed ${
                    sibling.slug === content.slug
                      ? "font-bold text-primary-700"
                      : "text-muted hover:text-primary-700"
                  }`}
                >
                  <AcademyKindIcon kind={sibling.kind} size={13} className="mt-0.5 shrink-0" />
                  <span>{sibling.title}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
