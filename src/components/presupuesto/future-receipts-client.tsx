"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { IconAlertCircle, IconCheck, IconPlus } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyValue } from "@/components/ui/money-value";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";

export interface ReceiptView {
  id: string;
  description: string;
  counterparty: string | null;
  amountMinor: number;
  expectedOn: string;
  receivedOn: string | null;
  status: string;
  isRecurring: boolean;
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMAT.format(parsed);
}

function NewReceiptDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedOn, setExpectedOn] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription("");
      setCounterparty("");
      setAmount("");
      setExpectedOn(new Date().toISOString().slice(0, 10));
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const errors = dict.futureReceipts.form.errors;
    if (!description.trim()) return setError(errors.description);
    if (!amount.trim()) return setError(errors.amount);
    if (!expectedOn) return setError(errors.date);

    setSaving(true);
    try {
      const response = await fetch("/api/presupuesto/future-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          description: description.trim(),
          counterparty: counterparty.trim(),
          amount: amount.trim(),
          expectedOn,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError(errors.generic);
      setSaving(false);
    }
  }

  const form = dict.futureReceipts.form;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={form.title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="receipt-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="receipt-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <Input
          label={form.description}
          placeholder={form.descriptionPlaceholder}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={200}
          required
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.amount}
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <Input
            label={form.expectedOn}
            type="date"
            value={expectedOn}
            onChange={(event) => setExpectedOn(event.target.value)}
            required
          />
        </div>
        <Input
          label={form.counterparty}
          value={counterparty}
          onChange={(event) => setCounterparty(event.target.value)}
          maxLength={120}
        />
      </form>
    </Modal>
  );
}

export function FutureReceiptsClient({
  pending,
  received,
  currency,
}: {
  pending: ReceiptView[];
  received: ReceiptView[];
  currency: CurrencyCode;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<ReceiptView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function runOp(receipt: ReceiptView, op: "markReceived" | "cancel", message: string) {
    setBusyId(receipt.id);
    try {
      const response = await fetch("/api/presupuesto/future-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, id: receipt.id }),
      });
      setBusyId(null);
      if (!response.ok) {
        toast({ title: dict.futureReceipts.form.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: message, variant: "success" });
      router.refresh();
    } catch {
      setBusyId(null);
      toast({ title: dict.futureReceipts.form.errors.generic, variant: "danger" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button iconLeft={<IconPlus size={15} />} onClick={() => setCreateOpen(true)}>
          {dict.futureReceipts.new}
        </Button>
      </div>

      <section aria-label={dict.futureReceipts.pendingSection}>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-faint">
          {dict.futureReceipts.pendingSection}
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={<IconCheck size={20} />}
            title={dict.futureReceipts.empty}
            description={dict.futureReceipts.emptyHint}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((receipt) => (
              <li
                key={receipt.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-text">{receipt.description}</p>
                    <Badge tone="warning">{dict.presupuesto.statuses.pending}</Badge>
                    {receipt.isRecurring ? (
                      <Badge tone="primary">{dict.presupuesto.list.recurring}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-faint">
                    {dict.futureReceipts.expected}: {formatDate(receipt.expectedOn)}
                    {receipt.counterparty ? <span> · {receipt.counterparty}</span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MoneyValue amount={receipt.amountMinor} kind="goal" currency={currency} />
                  <Button
                    size="sm"
                    variant="soft"
                    iconLeft={<IconCheck size={13} />}
                    disabled={busyId === receipt.id}
                    onClick={() => runOp(receipt, "markReceived", dict.futureReceipts.received)}
                  >
                    {dict.futureReceipts.markReceived}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === receipt.id}
                    onClick={() => setConfirmCancel(receipt)}
                  >
                    {dict.futureReceipts.cancel}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={dict.futureReceipts.receivedSection}>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-faint">
          {dict.futureReceipts.receivedSection}
        </h2>
        {received.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-xs text-faint">
            {dict.futureReceipts.emptyReceived}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {received.map((receipt) => (
              <li
                key={receipt.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/70 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-muted">{receipt.description}</p>
                  <p className="mt-0.5 text-xs text-faint">
                    {formatDate(receipt.receivedOn ?? receipt.expectedOn)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyValue amount={receipt.amountMinor} kind="income" currency={currency} />
                  <Badge tone="success" dot>
                    {dict.presupuesto.statuses.received}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewReceiptDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title={dict.futureReceipts.confirmCancel.title}
        description={dict.futureReceipts.confirmCancel.desc}
        confirmLabel={dict.futureReceipts.confirmCancel.confirm}
        tone="primary"
        loading={busyId !== null}
        icon={<IconAlertCircle size={18} />}
        onConfirm={() => {
          if (confirmCancel) {
            setConfirmCancel(null);
            void runOp(confirmCancel, "cancel", dict.futureReceipts.cancelled);
          }
        }}
      />
    </div>
  );
}
