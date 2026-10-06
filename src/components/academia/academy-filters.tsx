"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconSearch, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AcademyFilters } from "@/lib/academy";
import type { AcademyKind, AcademyLevel } from "@/lib/academy-shared";
import { getDictionary } from "@/lib/i18n";

/**
 * Filtros de la Academia (Etapa 19) — dirigidos por URL, igual que el
 * Presupuesto y los Informes: `?tipo=&nivel=&estado=&q=&cat=`. Sin filtros
 * activos, la URL queda limpia.
 */
export function AcademyFiltersBar({
  filters,
  kinds,
  levels,
  resultCount,
  totalCount,
  basePath,
  /** En la página de categoría el filtro de categoría no aplica. */
  keepCategory = false,
}: {
  filters: AcademyFilters;
  kinds: AcademyKind[];
  levels: AcademyLevel[];
  resultCount: number;
  totalCount: number;
  basePath: string;
  keepCategory?: boolean;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const pathname = usePathname() || basePath;
  // El campo se remonta cuando la URL cambia (`key`), así que no necesita
  // sincronizar estado dentro de un efecto.
  const [query, setQuery] = useState(filters.query);

  function push(next: Partial<AcademyFilters>) {
    const merged: AcademyFilters = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.kind !== "all") params.set("tipo", merged.kind);
    if (merged.level !== "all") params.set("nivel", merged.level);
    if (merged.state !== "all") params.set("estado", merged.state);
    if (merged.query.length > 0) params.set("q", merged.query);
    if (keepCategory && merged.category !== "all") params.set("cat", merged.category);
    // La categoría vive en la ruta `/categoria/[slug]`, no en la query.
    const search = params.toString();
    router.push(search.length > 0 ? `${pathname}?${search}` : pathname);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    push({ query: query.trim() });
  }

  const hasFilters =
    filters.kind !== "all" ||
    filters.level !== "all" ||
    filters.state !== "all" ||
    filters.query.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          key={filters.query}
          label={dict.academy.home.searchLabel}
          placeholder={dict.academy.home.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          iconLeft={<IconSearch size={15} />}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" size="md" iconLeft={<IconSearch size={14} />}>
          {dict.academy.home.searchLabel}
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.length > 1 ? (
          <Select
            label={dict.academy.filters.kind}
            value={filters.kind}
            onChange={(event) => push({ kind: event.target.value as AcademyFilters["kind"] })}
          >
            <option value="all">{dict.academy.filters.allKinds}</option>
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {dict.academy.kinds[kind as keyof typeof dict.academy.kinds] ?? kind}
              </option>
            ))}
          </Select>
        ) : null}

        {levels.length > 1 ? (
          <Select
            label={dict.academy.filters.level}
            value={filters.level}
            onChange={(event) => push({ level: event.target.value as AcademyFilters["level"] })}
          >
            <option value="all">{dict.academy.filters.allLevels}</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {dict.academy.levels[level as keyof typeof dict.academy.levels] ?? level}
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          label={dict.academy.filters.state}
          value={filters.state}
          onChange={(event) => push({ state: event.target.value as AcademyFilters["state"] })}
        >
          <option value="all">{dict.academy.filters.allStates}</option>
          <option value="pending">{dict.academy.filters.pending}</option>
          <option value="in_progress">{dict.academy.filters.inProgress}</option>
          <option value="completed">{dict.academy.filters.completed}</option>
          <option value="favorite">{dict.academy.filters.favorites}</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-faint">
          {dict.academy.home.resultsCount
            .replace("{count}", String(resultCount))
            .replace("{total}", String(totalCount))}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              push({ kind: "all", level: "all", state: "all", query: "" });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-hover"
          >
            <IconX size={13} />
            {dict.academy.filters.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
