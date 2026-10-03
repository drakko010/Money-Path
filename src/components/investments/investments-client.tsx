"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  IconCheck,
  IconInfo,
  IconLandmark,
  IconPlus,
  IconTrash,
  IconTrendingUp,
} from "@/components/icons";
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
import { CURRENCIES, type CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { AccountView, EvolutionPoint, InvestmentView, InvestmentsData } from "@/lib/investments";

const ACCOUNT_TYPES = ["brokerage", "bank", "afore", "crypto", "other"] as const;
const INVESTMENT_CATEGORIES = ["cetes", "fund", "etf", "stock", "bond", "crypto", "other"] as const;

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

function EvolutionChart({ points, currency }: { points: EvolutionPoint[]; currency: CurrencyCode }) {
  const width = 560;
  const height = 170;
  const padX = 12;
  const padY = 20;

  const values = points.map((point) => point.investedMinor);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (point.investedMinor - min) / range) * (height - padY * 2);
    return { x, y };
  });
  const line = coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const area = `M ${coords[0].x} ${height - 4} L ${line.split(" ").join(" L ")} L ${
    coords[coords.length - 1].x
  } ${height - 4} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        <defs>
          <linearGradient id="invest-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-f-investment)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-f-investment)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#invest-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-f-investment)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((coord, index) => (
          <circle
            key={index}
            cx={coord.x}
            cy={coord.y}
            r="3"
            fill="var(--color-f-investment)"
          >
            <title>{`${points[index].month}: ${formatMoney(points[index].investedMinor, { currency })}`}</title>
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

/* ── Nueva cuenta ────────────────────────────────────────────────────── */

function NewAccountDialog({
  open,
  onOpenChange,
  baseCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCurrency: CurrencyCode;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<string>("brokerage");
  const [currency, setCurrency] = useState<CurrencyCode>(baseCurrency);
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setInstitution("");
      setName("");
      setAccountType("brokerage");
      setCurrency(baseCurrency);
      setBalance("");
      setError(null);
      setSaving(false);
    }
  }, [open, baseCurrency]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "createAccount",
          institution: institution.trim(),
          name: name.trim(),
          accountType,
          currency,
          balance: balance.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.investmentsModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.investmentsModule.accountForm.save, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.investmentsModule.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.investmentsModule.accountForm;

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
          <Button type="submit" form="account-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.institution}
            placeholder={form.institutionPlaceholder}
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            maxLength={120}
            required
          />
          <Input
            label={form.name}
            placeholder={form.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Select label={form.type} value={accountType} onChange={(event) => setAccountType(event.target.value)}>
            {ACCOUNT_TYPES.map((option) => (
              <option key={option} value={option}>
                {dict.investmentsModule.accountTypes[option]}
              </option>
            ))}
          </Select>
          <Select label={form.currency} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
            {Object.values(CURRENCIES).map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code} — {entry.label}
              </option>
            ))}
          </Select>
          <Input
            label={form.balance}
            placeholder="0.00"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ── Nueva inversión ─────────────────────────────────────────────────── */

function NewInvestmentDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountView[];
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("cetes");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("cetes");
      setQuantity("");
      setAvgPrice("");
      setInvested("");
      setCurrent("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setAccountId("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  // Autocompleta el importe invertido desde cantidad × precio promedio.
  useEffect(() => {
    const qty = Number(quantity.replace(/,/g, ""));
    const price = Number(avgPrice.replace(/[$,\s]/g, ""));
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price > 0) {
      setInvested((qty * price).toFixed(2));
    }
  }, [quantity, avgPrice]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "createInvestment",
          name: name.trim(),
          category,
          quantity: quantity.trim(),
          avgPrice: avgPrice.trim(),
          invested: invested.trim(),
          current: current.trim(),
          startDate,
          accountId: accountId || null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.investmentsModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.investmentsModule.investmentForm.save, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.investmentsModule.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.investmentsModule.investmentForm;

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
          <Button type="submit" form="investment-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="investment-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
          <Select label={form.category} value={category} onChange={(event) => setCategory(event.target.value)}>
            {INVESTMENT_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {dict.investmentsModule.categories[option]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Input
            label={form.quantity}
            placeholder="10"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <Input
            label={form.avgPrice}
            placeholder="1,500.00"
            inputMode="decimal"
            value={avgPrice}
            onChange={(event) => setAvgPrice(event.target.value)}
          />
          <Input
            label={form.invested}
            placeholder="15,000.00"
            inputMode="decimal"
            value={invested}
            onChange={(event) => setInvested(event.target.value)}
            hint={form.investedHint}
            required
          />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Input
            label={form.current}
            placeholder="15,750.00"
            inputMode="decimal"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <Input
            label={form.date}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Select label={form.account} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">{form.noAccount}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.institution} — {account.name}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}

/* ── Aporte ──────────────────────────────────────────────────────────── */

function ContributeDialog({
  investment,
  onOpenChange,
}: {
  investment: InvestmentView | null;
  onOpenChange: (open: boolean) => void;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) {
      setAmount("");
      setNote("");
      setError(null);
      setSaving(false);
    }
  }, [investment]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!investment) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "contribute", id: investment.id, amount: amount.trim(), note: note.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.investmentsModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.investmentsModule.contribute.saved, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.investmentsModule.errors.generic);
      setSaving(false);
    }
  }

  if (!investment) return null;

  return (
    <Modal
      open={investment !== null}
      onOpenChange={onOpenChange}
      title={dict.investmentsModule.contribute.title.replace("{name}", investment.name)}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="invest-contribute-form" loading={saving}>
            {dict.investmentsModule.contribute.save}
          </Button>
        </>
      }
    >
      <form id="invest-contribute-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <Input
          label={dict.investmentsModule.contribute.amount}
          placeholder="1,000.00"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Input
          label={dict.investmentsModule.contribute.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
        />
      </form>
    </Modal>
  );
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function InvestmentsModule({ data }: { data: InvestmentsData }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const currency = data.currency;

  const [tab, setTab] = useState("investments");
  const [accountOpen, setAccountOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [contributing, setContributing] = useState<InvestmentView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "investment" | "account";
    id: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: confirmDelete.type === "investment" ? "deleteInvestment" : "deleteAccount",
          id: confirmDelete.id,
        }),
      });
      setBusy(false);
      setConfirmDelete(null);
      if (!response.ok) {
        toast({ title: dict.investmentsModule.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.investmentsModule.confirmDelete.confirm, variant: "success" });
      router.refresh();
    } catch {
      setBusy(false);
      setConfirmDelete(null);
      toast({ title: dict.investmentsModule.errors.generic, variant: "danger" });
    }
  }

  const gain = data.summary.totalGainMinor;

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.investmentsModule.summary.invested}</p>
          <MoneyValue className="mt-1.5" amount={data.summary.totalInvestedMinor} kind="investment" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.investmentsModule.summary.current}</p>
          <MoneyValue className="mt-1.5" amount={data.summary.totalCurrentMinor} kind="equity" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.investmentsModule.summary.gain}</p>
          <p
            className={`mt-1.5 font-display text-lg font-bold tabular-nums ${
              gain >= 0 ? "text-success-strong" : "text-danger-strong"
            }`}
          >
            {signedMoney(gain, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.investmentsModule.summary.percent}</p>
          <p
            className={`mt-1.5 font-display text-lg font-bold tabular-nums ${
              (data.summary.gainPercent ?? 0) >= 0 ? "text-success-strong" : "text-danger-strong"
            }`}
          >
            {data.summary.gainPercent === null ? "—" : `${data.summary.gainPercent >= 0 ? "+" : ""}${data.summary.gainPercent.toFixed(2)}%`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.investmentsModule.summary.contributions}</p>
          <MoneyValue className="mt-1.5" amount={data.summary.totalContributionsMinor} kind="goal" currency={currency} size="lg" />
        </Card>
      </div>

      {/* Evolución */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrendingUp size={17} className="text-primary-700" />
            {dict.investmentsModule.evolution.title}
          </CardTitle>
          <CardDescription>{dict.investmentsModule.evolution.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.summary.totalInvestedMinor > 0 ? (
            <EvolutionChart points={data.evolution} currency={currency} />
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-xs text-faint">
              {dict.investmentsModule.evolution.empty}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-1">
            <TabsTrigger value="investments">{dict.investmentsModule.tabs.investments}</TabsTrigger>
            <TabsTrigger value="accounts">{dict.investmentsModule.tabs.accounts}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="secondary" iconLeft={<IconLandmark size={15} />} onClick={() => setAccountOpen(true)}>
              {dict.investmentsModule.newAccount}
            </Button>
            <Button iconLeft={<IconPlus size={15} />} onClick={() => setInvestmentOpen(true)}>
              {dict.investmentsModule.newInvestment}
            </Button>
          </div>
        </div>

        <TabsPanel value="investments">
          {data.investments.length === 0 ? (
            <EmptyState
              icon={<IconTrendingUp size={20} />}
              title={dict.investmentsModule.empty}
              description={dict.investmentsModule.emptyHint}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.investments.map((investment) => (
                <Card key={investment.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate">{investment.name}</CardTitle>
                        <Badge tone="primary">
                          {dict.investmentsModule.categories[investment.category as keyof typeof dict.investmentsModule.categories] ?? investment.category}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {investment.accountName ?? "—"}
                        {investment.startDate ? ` · ${dict.investmentsModule.fields.since} ${formatDate(investment.startDate)}` : ""}
                      </CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ type: "investment", id: investment.id, name: investment.name })}
                      aria-label={dict.investmentsModule.confirmDelete.investment}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {investment.quantity !== null && investment.averagePriceMinor !== null ? (
                      <p className="text-xs text-muted">
                        {investment.quantity} × {formatMoney(investment.averagePriceMinor, { currency })}
                      </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
                          {dict.investmentsModule.fields.invested}
                        </p>
                        <MoneyValue className="mt-0.5" amount={investment.investedMinor} kind="investment" currency={currency} size="sm" />
                      </div>
                      <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
                          {dict.investmentsModule.fields.current}
                        </p>
                        <MoneyValue className="mt-0.5" amount={investment.currentMinor} kind="equity" currency={currency} size="sm" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">{dict.investmentsModule.fields.gain}</span>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          investment.gainMinor >= 0 ? "text-success-strong" : "text-danger-strong"
                        }`}
                      >
                        {signedMoney(investment.gainMinor, currency)}
                        {investment.gainPercent !== null ? ` (${investment.gainPercent >= 0 ? "+" : ""}${investment.gainPercent.toFixed(2)}%)` : ""}
                      </span>
                    </div>
                    <Button variant="soft" iconLeft={<IconPlus size={14} />} onClick={() => setContributing(investment)}>
                      {dict.investmentsModule.contributeButton}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="accounts">
          {data.accounts.length === 0 ? (
            <EmptyState
              icon={<IconLandmark size={20} />}
              title={dict.investmentsModule.emptyAccounts}
              description={dict.investmentsModule.emptyAccountsHint}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{account.institution}</CardTitle>
                      <CardDescription className="mt-1 truncate">{account.name}</CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete({ type: "account", id: account.id, name: account.institution })}
                      aria-label={dict.investmentsModule.confirmDelete.account}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={15} />
                    </button>
                  </CardHeader>
                  <CardContent>
                    <Badge tone="neutral">
                      {dict.investmentsModule.accountTypes[account.accountType as keyof typeof dict.investmentsModule.accountTypes] ?? account.accountType}
                    </Badge>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted">{dict.investmentsModule.fields.balance}</span>
                      <span className="text-sm font-bold tabular-nums text-text">
                        {formatMoney(account.balanceMinor, { currency: account.currency as CurrencyCode })}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-faint">
                      {account.investmentsCount} {dict.investmentsModule.tabs.investments.toLowerCase()} · {account.currency}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsPanel>
      </Tabs>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <IconInfo size={13} className="mt-0.5 shrink-0 text-accent-500" />
        {dict.investmentsModule.disclaimer}
      </p>

      <NewAccountDialog open={accountOpen} onOpenChange={setAccountOpen} baseCurrency={currency} />
      <NewInvestmentDialog open={investmentOpen} onOpenChange={setInvestmentOpen} accounts={data.accounts} />
      <ContributeDialog investment={contributing} onOpenChange={(open) => !open && setContributing(null)} />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={
          confirmDelete?.type === "account"
            ? dict.investmentsModule.confirmDelete.account
            : dict.investmentsModule.confirmDelete.investment
        }
        description={dict.investmentsModule.confirmDelete.desc}
        confirmLabel={dict.investmentsModule.confirmDelete.confirm}
        tone="danger"
        loading={busy}
        icon={<IconTrash size={18} />}
        onConfirm={() => void doDelete()}
      />
    </div>
  );
}
