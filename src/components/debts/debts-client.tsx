"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconCreditCard,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { MoneyValue } from "@/components/ui/money-value";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { DEBT_KINDS, type DebtKind, type DebtPriority } from "@/lib/debts-shared";
import type { DebtAlert, DebtView, DebtsSummary } from "@/lib/debts";
import { PaymentPlan } from "./payment-plan";

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

/* ── Formulario de alta ──────────────────────────────────────────────── */

function NewDebtDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [creditor, setCreditor] = useState("");
  const [kind, setKind] = useState<DebtKind>("credit_card");
  const [initialAmount, setInitialAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [minimum, setMinimum] = useState("");
  const [installments, setInstallments] = useState("");
  const [priority, setPriority] = useState<DebtPriority>(2);
  const [status, setStatus] = useState<"active" | "defaulted">("active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCreditor("");
      setKind("credit_card");
      setInitialAmount("");
      setBalance("");
      setRate("");
      setDueDay("");
      setMinimum("");
      setInstallments("");
      setPriority(2);
      setStatus("active");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          name: name.trim(),
          creditor: creditor.trim(),
          kind,
          initialAmount: initialAmount.trim(),
          balance: balance.trim(),
          rate: rate.trim(),
          dueDay: dueDay.trim(),
          minimum: minimum.trim(),
          installments: installments.trim(),
          priority,
          status,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.debtsModule.form.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.debtsModule.savedToast, variant: "success" });
      router.refresh();
    } catch {
      setError(dict.debtsModule.form.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.debtsModule.form;

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
          <Button type="submit" form="debt-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="debt-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
          <Input
            label={form.creditor}
            value={creditor}
            onChange={(event) => setCreditor(event.target.value)}
            maxLength={120}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select label={form.kind} value={kind} onChange={(event) => setKind(event.target.value as DebtKind)}>
            {DEBT_KINDS.map((option) => (
              <option key={option} value={option}>
                {dict.debtsModule.kindLabels[option]}
              </option>
            ))}
          </Select>
          <Select label={form.priority} value={String(priority)} onChange={(event) => setPriority(Number(event.target.value) as DebtPriority)}>
            <option value="1">{dict.debtsModule.priorityLabels["1"]}</option>
            <option value="2">{dict.debtsModule.priorityLabels["2"]}</option>
            <option value="3">{dict.debtsModule.priorityLabels["3"]}</option>
          </Select>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.initialAmount}
            placeholder="25,000.00"
            inputMode="decimal"
            value={initialAmount}
            onChange={(event) => setInitialAmount(event.target.value)}
            required
          />
          <Input
            label={form.balance}
            placeholder="25,000.00"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Input
            label={form.rate}
            placeholder="45.5"
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
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
          <Input
            label={form.minimum}
            placeholder="850.00"
            inputMode="decimal"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.installments}
            type="number"
            min={1}
            max={600}
            value={installments}
            onChange={(event) => setInstallments(event.target.value)}
          />
          <Select label={form.status} value={status} onChange={(event) => setStatus(event.target.value as "active" | "defaulted")}>
            <option value="active">{dict.debtsModule.statusLabels.active}</option>
            <option value="defaulted">{dict.debtsModule.statusLabels.defaulted}</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}

/* ── Abono ───────────────────────────────────────────────────────────── */

function PayDebtDialog({
  debt,
  onOpenChange,
  currency,
}: {
  debt: DebtView | null;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (debt) {
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setError(null);
      setSaving(false);
    }
  }, [debt]);

  const amountCheck = useMemo(() => {
    if (!debt || !amount.trim()) return null;
    const cleaned = amount.replace(/[$,\s]/g, "");
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Math.min(debt.balanceMinor, Math.round(numeric * 100));
  }, [amount, debt]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!debt) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "pay", id: debt.id, amount: amount.trim(), date, note: note.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.debtsModule.payForm.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.debtsModule.paymentToast, variant: "success" });
      router.refresh();
    } catch {
      setError(dict.debtsModule.payForm.errors.generic);
      setSaving(false);
    }
  }

  if (!debt) return null;

  return (
    <Modal
      open={debt !== null}
      onOpenChange={onOpenChange}
      title={dict.debtsModule.payForm.title.replace("{name}", debt.name)}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="pay-form" loading={saving}>
            {dict.debtsModule.payForm.save}
          </Button>
        </>
      }
    >
      <form id="pay-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={dict.debtsModule.payForm.amount}
            placeholder="1,000.00"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <Input
            label={dict.debtsModule.payForm.date}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <Input
          label={dict.debtsModule.payForm.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
        />
        {amountCheck !== null ? (
          <p className="text-xs text-muted">
            {dict.debtsModule.payForm.balanceAfter}:{" "}
            <span className="font-bold tabular-nums text-text">
              {formatMoney(Math.max(0, debt.balanceMinor - amountCheck), { currency })}
            </span>
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function DebtsModule({
  currency,
  debts,
  summary,
  alerts,
  surplusMinor,
}: {
  currency: CurrencyCode;
  debts: DebtView[];
  summary: DebtsSummary;
  alerts: DebtAlert[];
  surplusMinor: number;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [paying, setPaying] = useState<DebtView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DebtView | null>(null);
  const [busy, setBusy] = useState(false);

  async function deleteDebt(debt: DebtView) {
    setBusy(true);
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "delete", id: debt.id }),
      });
      setBusy(false);
      setConfirmDelete(null);
      if (!response.ok) {
        toast({ title: dict.debtsModule.form.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.debtsModule.deletedToast, variant: "success" });
      router.refresh();
    } catch {
      setBusy(false);
      setConfirmDelete(null);
      toast({ title: dict.debtsModule.form.errors.generic, variant: "danger" });
    }
  }

  const openDebts = debts.filter((debt) => debt.status === "active" || debt.status === "defaulted");

  return (
    <div className="flex flex-col gap-6">
      {/* Alertas de vencimiento */}
      {alerts.length > 0 ? (
        <Alert
          variant="warning"
          title={dict.debtsModule.alerts.title}
          description={alerts
            .map((alert) => {
              const when =
                alert.days <= 0
                  ? dict.debtsModule.alerts.today
                  : alert.days === 1
                    ? dict.debtsModule.alerts.one
                    : dict.debtsModule.alerts.many.replace("{days}", String(alert.days));
              return `${alert.name}: ${when} (${formatDate(alert.dueDate)}).`;
            })
            .join(" · ")}
        />
      ) : null}

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.debtsModule.summary.total}</p>
          <MoneyValue className="mt-1.5" amount={summary.totalMinor} kind="debt" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.debtsModule.summary.remaining}</p>
          <MoneyValue className="mt-1.5" amount={summary.remainingMinor} kind="expense" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.debtsModule.summary.monthPayments}</p>
          <MoneyValue className="mt-1.5" amount={summary.monthPaymentsMinor} kind="goal" currency={currency} size="lg" />
          <p className="mt-1 text-[11px] text-faint">
            {dict.debtsModule.summary.paymentsCount.replace("{count}", String(summary.monthPaymentsCount))}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.debtsModule.summary.progress}</p>
          <div className="mt-3">
            <Progress value={summary.progressPercent} tone="success" size="sm" showValue />
          </div>
        </Card>
      </div>

      {/* Acciones + contenido */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-1">
            <TabsTrigger value="list">{dict.debtsModule.tabs.list}</TabsTrigger>
            <TabsTrigger value="plan">{dict.debtsModule.tabs.plan}</TabsTrigger>
          </TabsList>
          <Button iconLeft={<IconPlus size={15} />} onClick={() => setCreateOpen(true)}>
            {dict.debtsModule.new}
          </Button>
        </div>

        <TabsPanel value="list">
          {openDebts.length === 0 ? (
            debts.length === 0 ? (
              <EmptyState
                icon={<IconCreditCard size={20} />}
                title={dict.debtsModule.empty}
                description={dict.debtsModule.emptyHint}
              />
            ) : (
              <EmptyState icon={<IconCheck size={20} />} title={dict.debtsModule.noDebts} />
            )
          ) : (
            <ul className="flex flex-col gap-2">
              {openDebts.map((debt) => (
                <li
                  key={debt.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-text">{debt.name}</p>
                      <Badge tone="neutral">{dict.debtsModule.kindLabels[debt.kind]}</Badge>
                      {debt.status === "defaulted" ? (
                        <Badge tone="danger" dot>
                          {dict.debtsModule.statusLabels.defaulted}
                        </Badge>
                      ) : null}
                      <Badge
                        tone={debt.priority === 1 ? "danger" : debt.priority === 2 ? "warning" : "neutral"}
                      >
                        {dict.debtsModule.priorityLabels[String(debt.priority) as "1" | "2" | "3"]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-faint">
                      {debt.creditor ? (
                        <span className="font-semibold text-muted">{debt.creditor}</span>
                      ) : null}
                      <span>
                        {dict.debtsModule.fields.rate}:{" "}
                        {debt.annualRate > 0 ? `${debt.annualRate}%` : "—"}
                      </span>
                      <span>
                        {dict.debtsModule.fields.minimum}:{" "}
                        {debt.minimumMinor > 0 ? formatMoney(debt.minimumMinor, { currency }) : "—"}
                      </span>
                      {debt.totalInstallments ? (
                        <span>
                          {dict.debtsModule.fields.installments}: {debt.totalInstallments}
                        </span>
                      ) : null}
                      {debt.nextDue ? (
                        <span
                          className={
                            debt.daysUntilDue !== null && debt.daysUntilDue <= 7
                              ? "font-bold text-warning-strong"
                              : undefined
                          }
                        >
                          {dict.debtsModule.fields.dueNext}: {formatDate(debt.nextDue)}
                          {debt.daysUntilDue !== null ? ` (${debt.daysUntilDue}d)` : ""}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MoneyValue amount={debt.balanceMinor} kind="debt" currency={currency} size="lg" />
                    <p className="text-[11px] tabular-nums text-faint">
                      {dict.debtsModule.fields.initial}: {formatMoney(debt.initialMinor, { currency })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="soft" onClick={() => setPaying(debt)}>
                      {dict.debtsModule.registerPayment}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger-soft"
                      iconLeft={<IconTrash size={13} />}
                      disabled={busy}
                      onClick={() => setConfirmDelete(debt)}
                      aria-label={dict.debtsModule.confirmDelete.title}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsPanel>

        <TabsPanel value="plan">
          <PaymentPlan debts={debts} currency={currency} surplusMinor={surplusMinor} />
        </TabsPanel>
      </Tabs>

      <NewDebtDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PayDebtDialog debt={paying} onOpenChange={(open) => !open && setPaying(null)} currency={currency} />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={dict.debtsModule.confirmDelete.title}
        description={dict.debtsModule.confirmDelete.desc}
        confirmLabel={dict.debtsModule.confirmDelete.confirm}
        tone="danger"
        loading={busy}
        icon={<IconAlertTriangle size={18} />}
        onConfirm={() => {
          if (confirmDelete) void deleteDebt(confirmDelete);
        }}
      />
    </div>
  );
}
