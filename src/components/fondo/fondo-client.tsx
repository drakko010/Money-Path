"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { IconCheck, IconInfo, IconShield, IconTarget } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyValue } from "@/components/ui/money-value";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { FondoData } from "@/lib/fondo";

const MONTH_PRESETS = [3, 6, 9, 12];

export function FondoClient({ data }: { data: FondoData }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const currency = data.currency;

  // Configuración (meses + override).
  const [targetMonths, setTargetMonths] = useState<number>(data.targetMonths);
  const [customMonths, setCustomMonths] = useState<string>("");
  const [useOverride, setUseOverride] = useState<boolean>(data.essentialSource === "override");
  const [overrideText, setOverrideText] = useState<string>(
    data.overrideMinor !== null ? String(data.overrideMinor / 100) : "",
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Aportes.
  const [contributeText, setContributeText] = useState("");
  const [savingContribute, setSavingContribute] = useState(false);
  const [setCurrentText, setSetCurrentText] = useState("");
  const [savingSetCurrent, setSavingSetCurrent] = useState(false);

  // Toggles de categorías (optimista local mientras llega el refresh).
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);

  const fullMonths = MONTH_PRESETS.includes(targetMonths) ? targetMonths : 0;
  const isCustom = fullMonths === 0;

  const monthsProtected = data.monthsProtected;
  const coveredBlocks = useMemo(() => {
    const blocks: number[] = [];
    const target = Math.max(1, Math.round(data.targetMonths));
    const cap = Math.min(target, 24);
    for (let i = 0; i < cap; i += 1) {
      let fraction = 0;
      if (i < Math.floor(monthsProtected)) fraction = 1;
      else if (i === Math.floor(monthsProtected)) fraction = monthsProtected - Math.floor(monthsProtected);
      blocks.push(fraction);
    }
    return blocks;
  }, [monthsProtected, data.targetMonths]);

  async function saveConfig(event?: FormEvent) {
    event?.preventDefault();
    setConfigError(null);
    const months = isCustom ? Number(customMonths) : fullMonths;
    if (!Number.isFinite(months) || months < 1 || months > 36) {
      setConfigError(dict.fondo.errors.months);
      return;
    }
    setSavingConfig(true);
    try {
      const response = await fetch("/api/fondo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "configure",
          targetMonths: months,
          useOverride,
          essentialOverride: overrideText.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setConfigError(payload?.message ?? dict.fondo.errors.generic);
        setSavingConfig(false);
        return;
      }
      toast({ title: dict.fondo.config.saved, variant: "success" });
      router.refresh();
      setSavingConfig(false);
    } catch {
      setConfigError(dict.fondo.errors.generic);
      setSavingConfig(false);
    }
  }

  async function toggleCategory(categoryId: string, next: boolean) {
    setTogglingCategory(categoryId);
    try {
      await fetch("/api/fondo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "toggleCategory", categoryId, isEssential: next }),
      });
      router.refresh();
    } finally {
      setTogglingCategory(null);
    }
  }

  async function contribute(event: FormEvent) {
    event.preventDefault();
    setSavingContribute(true);
    try {
      const response = await fetch("/api/fondo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "contribute", amount: contributeText.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        toast({ title: payload?.message ?? dict.fondo.errors.generic, variant: "danger" });
        setSavingContribute(false);
        return;
      }
      setContributeText("");
      toast({ title: dict.fondo.contribute.saved, variant: "success" });
      router.refresh();
      setSavingContribute(false);
    } catch {
      toast({ title: dict.fondo.errors.generic, variant: "danger" });
      setSavingContribute(false);
    }
  }

  async function setCurrent(event: FormEvent) {
    event.preventDefault();
    setSavingSetCurrent(true);
    try {
      const response = await fetch("/api/fondo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "setCurrent", amount: setCurrentText.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        toast({ title: payload?.message ?? dict.fondo.errors.generic, variant: "danger" });
        setSavingSetCurrent(false);
        return;
      }
      setSetCurrentText("");
      toast({ title: dict.fondo.contribute.saved, variant: "success" });
      router.refresh();
      setSavingSetCurrent(false);
    } catch {
      toast({ title: dict.fondo.errors.generic, variant: "danger" });
      setSavingSetCurrent(false);
    }
  }

  const s = dict.fondo.summary;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Resumen ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{s.target}</p>
          <MoneyValue className="mt-1.5" amount={data.targetMinor} kind="goal" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{s.current}</p>
          <MoneyValue className="mt-1.5" amount={data.currentMinor} kind="investment" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{s.remaining}</p>
          <MoneyValue className="mt-1.5" amount={data.remainingMinor} kind="expense" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{s.percent}</p>
          <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-primary-900">
            {data.percent}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{s.monthsProtected}</p>
          <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-primary-900">
            {monthsProtected.toFixed(1)}
            <span className="ml-1 text-xs font-semibold text-faint">{s.monthsUnit}</span>
          </p>
        </Card>
      </div>

      {/* ── Progreso ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconTarget size={17} className="text-primary-700" />
              {dict.fondo.progress.title}
            </CardTitle>
            <CardDescription>
              {dict.fondo.progress.monthsCovered
                .replace("{covered}", monthsProtected.toFixed(1))
                .replace("{target}", String(data.targetMonths))}
            </CardDescription>
          </div>
          {data.percent >= 100 ? (
            <Badge tone="success" dot>
              {s.complete}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="flex h-4 w-full gap-1 overflow-hidden rounded-full">
            {coveredBlocks.map((fraction, index) => (
              <div key={index} className="relative h-full flex-1 overflow-hidden rounded-sm bg-primary-50">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(fraction * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">
            {dict.fondo.progress.needPerMonth.replace(
              "{monthly}",
              formatMoney(data.essentialMonthlyMinor, { currency }),
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Gasto esencial + configuración ─────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconShield size={17} className="text-primary-700" />
              {dict.fondo.essential.title}
            </CardTitle>
            <CardDescription>{dict.fondo.essential.explanation}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-text">
                  {formatMoney(data.essentialMonthlyMinor, { currency })}
                  <span className="ml-1 text-xs font-semibold text-faint">{dict.fondo.essential.perMonth}</span>
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {data.essentialSource === "override"
                    ? dict.fondo.essential.manual
                    : `${dict.fondo.essential.calculated} · ${dict.fondo.essential.windowNote.replace("{months}", String(data.windowMonths))}`}
                </p>
              </div>
              <Badge tone={data.essentialSource === "override" ? "warning" : "primary"}>
                {data.essentialSource === "override" ? dict.fondo.essential.manual : dict.fondo.essential.calculated}
              </Badge>
            </div>

            {data.essentialSource === "override" ? (
              <Alert variant="info" title={dict.fondo.essential.usingManual} />
            ) : null}

            {data.essentialSource === "calculated" && data.breakdown.length === 0 ? (
              <Alert variant="warning" title={dict.fondo.essential.noEssential} />
            ) : null}

            {/* Desglose de categorías esenciales usadas */}
            {data.breakdown.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border/60 rounded-xl border border-border">
                {data.breakdown.map((row) => (
                  <li key={row.categoryId} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-text">
                      <IconCheck size={14} className="text-success" />
                      {row.name}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-muted">
                      {formatMoney(row.monthlyMinor, { currency })}
                      {dict.fondo.categories.monthly}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* Objetivo de meses + override */}
            <form onSubmit={saveConfig} className="flex flex-col gap-4 border-t border-border/60 pt-4">
              <div>
                <p className="text-xs font-bold text-text">{dict.fondo.months.title}</p>
                <p className="mt-0.5 text-[11px] text-faint">{dict.fondo.months.hint}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MONTH_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setTargetMonths(preset);
                        setCustomMonths("");
                      }}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                        targetMonths === preset && !isCustom
                          ? "border-primary bg-primary text-primary-50"
                          : "border-border bg-surface text-muted hover:border-primary-300"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTargetMonths(0)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                      isCustom
                        ? "border-primary bg-primary text-primary-50"
                        : "border-border bg-surface text-muted hover:border-primary-300"
                    }`}
                  >
                    {dict.fondo.months.custom}
                  </button>
                  {isCustom ? (
                    <Input
                      type="number"
                      min={1}
                      max={36}
                      value={customMonths}
                      onChange={(event) => setCustomMonths(event.target.value)}
                      placeholder="1–36"
                      className="w-24"
                    />
                  ) : null}
                </div>
              </div>

              <Switch
                label={dict.fondo.config.useManual}
                checked={useOverride}
                onCheckedChange={setUseOverride}
              />
              {useOverride ? (
                <Input
                  label={dict.fondo.config.manualLabel}
                  placeholder="12,000.00"
                  inputMode="decimal"
                  value={overrideText}
                  onChange={(event) => setOverrideText(event.target.value)}
                />
              ) : null}

              {configError ? <Alert variant="danger" title={configError} /> : null}

              <Button type="submit" loading={savingConfig}>
                {dict.fondo.config.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Categorías esenciales + aportes ────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{dict.fondo.categories.title}</CardTitle>
              <CardDescription>{dict.fondo.categories.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categories.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
                  {dict.fondo.categories.empty}
                </p>
              ) : (
                <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
                  {data.categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-background/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text">
                          {category.name}
                        </span>
                        <span className="block text-[11px] tabular-nums text-faint">
                          {formatMoney(category.monthlyMinor, { currency })}
                          {dict.fondo.categories.monthly}
                        </span>
                      </span>
                      <Switch
                        checked={category.isEssential}
                        disabled={togglingCategory === category.id}
                        onCheckedChange={(next) => void toggleCategory(category.id, next)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.fondo.contribute.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form onSubmit={contribute} className="flex items-end gap-2">
                <Input
                  label={dict.fondo.contribute.amount}
                  placeholder="1,500.00"
                  inputMode="decimal"
                  value={contributeText}
                  onChange={(event) => setContributeText(event.target.value)}
                  className="flex-1"
                />
                <Button type="submit" loading={savingContribute}>
                  {dict.fondo.contribute.save}
                </Button>
              </form>
              <form onSubmit={setCurrent} className="flex items-end gap-2 border-t border-border/60 pt-4">
                <div className="flex-1">
                  <Input
                    label={dict.fondo.contribute.setCurrent}
                    placeholder="25,000.00"
                    inputMode="decimal"
                    value={setCurrentText}
                    onChange={(event) => setSetCurrentText(event.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-faint">{dict.fondo.contribute.setCurrentHint}</p>
                </div>
                <Button type="submit" variant="secondary" loading={savingSetCurrent}>
                  {dict.fondo.contribute.setCurrent}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <IconInfo size={13} className="mt-0.5 shrink-0 text-accent-500" />
        {dict.fondo.essential.explanation}
      </p>
    </div>
  );
}
