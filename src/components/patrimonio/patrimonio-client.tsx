"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { IconInfo, IconLandmark, IconPlus, IconTrash, IconTrendingUp } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { MoneyValue } from "@/components/ui/money-value";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { AssetView, LiabilityView, PatrimonioData, SnapshotPoint } from "@/lib/patrimonio";

const ASSET_KINDS = ["cash", "investment", "real_estate", "vehicle", "other"] as const;
const LIABILITY_KINDS = ["financing", "personal_loan", "credit_card", "other"] as const;

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMAT.format(parsed);
}

function signedMoney(minor: number, currency: CurrencyCode): string {
  const formatted = formatMoney(Math.abs(minor), { currency });
  return minor >= 0 ? `+${formatted}` : `−${formatted}`;
}

/* ── Gráfico de evolución ────────────────────────────────────────────── */

function EvolutionChart({ points, currency }: { points: SnapshotPoint[]; currency: CurrencyCode }) {
  const width = 560;
  const height = 170;
  const padX = 12;
  const padY = 20;

  const values = points.map((point) => point.netWorthMinor);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (point.netWorthMinor - min) / range) * (height - padY * 2);
    return { x, y };
  });
  const line = coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const zeroY = padY + (1 - (0 - min) / range) * (height - padY * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        {min < 0 ? (
          <line x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
        ) : null}
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((coord, index) => (
          <circle key={index} cx={coord.x} cy={coord.y} r="3" fill="var(--color-primary)">
            <title>{`${points[index].month}: ${formatMoney(points[index].netWorthMinor, { currency })}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-faint">
        <span>{points[0]?.month}</span>
        <span>{points[points.length - 1]?.month}</span>
      </div>
    </div>
  );
}

/* ── Nuevo activo ────────────────────────────────────────────────────── */

function NewAssetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("cash");
  const [value, setValue] = useState("");
  const [acquiredOn, setAcquiredOn] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setKind("cash");
      setValue("");
      setAcquiredOn("");
      setNote("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/patrimonio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "createAsset",
          name: name.trim(),
          kind,
          value: value.trim(),
          acquiredOn: acquiredOn || null,
          note: note.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.patrimonioModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.patrimonioModule.updatedToast, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.patrimonioModule.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.patrimonioModule.assetForm;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={form.title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="asset-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="asset-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        {kind === "vehicle" || kind === "real_estate" ? (
          <Alert variant="info" title={dict.patrimonioModule.valuation.externalSoon} />
        ) : null}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.name}
            placeholder={form.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
          <Select label={form.kind} value={kind} onChange={(event) => setKind(event.target.value)}>
            {ASSET_KINDS.map((option) => (
              <option key={option} value={option}>
                {dict.patrimonioModule.assetKinds[option]}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label={form.value}
          placeholder="250,000.00"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          hint={form.valueHint}
          required
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.acquiredOn}
            type="date"
            value={acquiredOn}
            onChange={(event) => setAcquiredOn(event.target.value)}
          />
          <Input label={form.note} value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} />
        </div>
      </form>
    </Modal>
  );
}

/* ── Nuevo pasivo ────────────────────────────────────────────────────── */

function NewLiabilityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("financing");
  const [amount, setAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setKind("financing");
      setAmount("");
      setMonthlyPayment("");
      setDueDay("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/patrimonio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "createLiability",
          name: name.trim(),
          kind,
          amount: amount.trim(),
          monthlyPayment: monthlyPayment.trim(),
          dueDay: dueDay.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.patrimonioModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.patrimonioModule.updatedToast, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.patrimonioModule.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.patrimonioModule.liabilityForm;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={form.title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="liability-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="liability-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.name}
            placeholder={form.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
          <Select label={form.kind} value={kind} onChange={(event) => setKind(event.target.value)}>
            {LIABILITY_KINDS.map((option) => (
              <option key={option} value={option}>
                {dict.patrimonioModule.liabilityKinds[option]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Input
            label={form.amount}
            placeholder="80,000.00"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <Input
            label={form.monthlyPayment}
            placeholder="3,500.00"
            inputMode="decimal"
            value={monthlyPayment}
            onChange={(event) => setMonthlyPayment(event.target.value)}
          />
          <Input
            label={form.dueDay}
            type="number"
            min={1}
            max={31}
            placeholder="10"
            value={dueDay}
            onChange={(event) => setDueDay(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function PatrimonioModule({ data }: { data: PatrimonioData }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const currency = data.currency;

  const [tab, setTab] = useState("assets");
  const [assetOpen, setAssetOpen] = useState(false);
  const [liabilityOpen, setLiabilityOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "asset" | "liability"; id: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const response = await fetch("/api/patrimonio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: confirmDelete.type === "asset" ? "deleteAsset" : "deleteLiability",
          id: confirmDelete.id,
        }),
      });
      setBusy(false);
      setConfirmDelete(null);
      if (!response.ok) {
        toast({ title: dict.patrimonioModule.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.patrimonioModule.updatedToast, variant: "success" });
      router.refresh();
    } catch {
      setBusy(false);
      setConfirmDelete(null);
      toast({ title: dict.patrimonioModule.errors.generic, variant: "danger" });
    }
  }

  const { totals } = data;
  const variation = totals.variationMinor;

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.patrimonioModule.summary.netWorth}</p>
          <p
            className={`mt-1.5 font-display text-xl font-bold tabular-nums ${
              totals.netWorthMinor >= 0 ? "text-primary-900" : "text-danger-strong"
            }`}
          >
            {signedMoney(totals.netWorthMinor, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.patrimonioModule.summary.assets}</p>
          <MoneyValue className="mt-1.5" amount={totals.assetsMinor} kind="investment" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.patrimonioModule.summary.liabilities}</p>
          <MoneyValue className="mt-1.5" amount={totals.liabilitiesMinor} kind="debt" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.patrimonioModule.summary.variation}</p>
          {variation === null ? (
            <p className="mt-1.5 text-sm font-semibold text-faint">{dict.patrimonioModule.summary.noPrevious}</p>
          ) : (
            <p
              className={`mt-1.5 font-display text-lg font-bold tabular-nums ${
                variation >= 0 ? "text-success-strong" : "text-danger-strong"
              }`}
            >
              {signedMoney(variation, currency)}
              {totals.variationPercent !== null
                ? ` (${totals.variationPercent >= 0 ? "+" : ""}${totals.variationPercent.toFixed(1)}%)`
                : ""}
            </p>
          )}
        </Card>
      </div>

      {/* Fórmula */}
      <p className="flex items-center gap-2 text-xs font-semibold text-faint">
        <IconInfo size={14} className="shrink-0 text-accent-500" />
        {dict.patrimonioModule.formula}
      </p>

      {/* Evolución */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrendingUp size={17} className="text-primary-700" />
            {dict.patrimonioModule.evolution.title}
          </CardTitle>
          <CardDescription>{dict.patrimonioModule.evolution.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.history.length > 0 ? (
            <EvolutionChart points={data.history} currency={currency} />
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
              {dict.patrimonioModule.evolution.empty}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-1">
            <TabsTrigger value="assets">{dict.patrimonioModule.tabs.assets}</TabsTrigger>
            <TabsTrigger value="liabilities">{dict.patrimonioModule.tabs.liabilities}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="secondary" iconLeft={<IconLandmark size={15} />} onClick={() => setLiabilityOpen(true)}>
              {dict.patrimonioModule.newLiability}
            </Button>
            <Button iconLeft={<IconPlus size={15} />} onClick={() => setAssetOpen(true)}>
              {dict.patrimonioModule.newAsset}
            </Button>
          </div>
        </div>

        <TabsPanel value="assets">
          {data.assets.length === 0 ? (
            <EmptyState
              icon={<IconLandmark size={20} />}
              title={dict.patrimonioModule.emptyAssets}
              description={dict.patrimonioModule.emptyAssetsHint}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.assets.map((asset) => (
                <Card key={asset.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate">{asset.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        <Badge tone="primary">
                          {dict.patrimonioModule.assetKinds[asset.kind as keyof typeof dict.patrimonioModule.assetKinds] ?? asset.kind}
                        </Badge>
                      </CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ type: "asset", id: asset.id })}
                      aria-label={dict.patrimonioModule.confirmDelete.asset}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-bold uppercase tracking-wider text-faint">
                      {dict.patrimonioModule.fields.value}
                    </p>
                    <MoneyValue className="mt-1" amount={asset.valueMinor} kind="investment" currency={currency} size="lg" />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-faint">
                      <Badge tone={asset.valuationSource === "external" ? "info" : "neutral"}>
                        {asset.valuationSource === "external"
                          ? dict.patrimonioModule.valuation.external
                          : dict.patrimonioModule.valuation.manual}
                      </Badge>
                      {asset.acquiredOn ? (
                        <span>
                          {dict.patrimonioModule.fields.acquired} {formatDate(asset.acquiredOn)}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="liabilities">
          {data.liabilities.length === 0 ? (
            <EmptyState
              icon={<IconLandmark size={20} />}
              title={dict.patrimonioModule.emptyLiabilities}
              description={dict.patrimonioModule.emptyLiabilitiesHint}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.liabilities.map((liability) => (
                <Card key={liability.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{liability.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge tone="danger">
                          {dict.patrimonioModule.liabilityKinds[liability.kind as keyof typeof dict.patrimonioModule.liabilityKinds] ?? liability.kind}
                        </Badge>
                      </CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ type: "liability", id: liability.id })}
                      aria-label={dict.patrimonioModule.confirmDelete.liability}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs font-bold uppercase tracking-wider text-faint">
                      {dict.patrimonioModule.fields.balance}
                    </p>
                    <MoneyValue className="mt-1" amount={liability.balanceMinor} kind="debt" currency={currency} size="lg" />
                    {liability.monthlyPaymentMinor !== null ? (
                      <p className="mt-2 text-[11px] text-faint">
                        {dict.patrimonioModule.fields.monthlyPayment}:{" "}
                        {formatMoney(liability.monthlyPaymentMinor, { currency })}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsPanel>
      </Tabs>

      <NewAssetDialog open={assetOpen} onOpenChange={setAssetOpen} />
      <NewLiabilityDialog open={liabilityOpen} onOpenChange={setLiabilityOpen} />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={
          confirmDelete?.type === "asset"
            ? dict.patrimonioModule.confirmDelete.asset
            : dict.patrimonioModule.confirmDelete.liability
        }
        description={dict.patrimonioModule.confirmDelete.desc}
        confirmLabel={dict.patrimonioModule.confirmDelete.confirm}
        tone="danger"
        loading={busy}
        icon={<IconTrash size={18} />}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
