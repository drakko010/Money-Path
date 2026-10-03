"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
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
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/installments-shared";

export interface OccurrenceView {
  number: number;
  date: string;
  amountMinor: number;
  status: "paid" | "pending" | "cancelled";
}

export interface InstallmentCardView {
  id: string;
  description: string;
  totalMinor: number;
  count: number;
  paidCount: number;
  paidMinor: number;
  remainingMinor: number;
  perInstallmentMinor: number;
  perInstallmentEven: boolean;
  endDate: string;
  nextDate: string | null;
  nextNumber: number | null;
  categoryName: string | null;
  paymentMethod: PaymentMethod;
  status: string;
  occurrences: OccurrenceView[];
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DATE_SHORT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMAT.format(parsed);
}

function formatShort(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_SHORT.format(parsed);
}

/* ── Alta de compra parcelada ────────────────────────────────────────── */

function NewInstallmentDialog({
  open,
  onOpenChange,
  currency,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
  categories: Array<{ id: string; name: string }>;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [count, setCount] = useState("12");
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription("");
      setTotalAmount("");
      setCount("12");
      setFirstDueDate(new Date().toISOString().slice(0, 10));
      setCategoryId("");
      setPaymentMethod("credit_card");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/presupuesto/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          description: description.trim(),
          totalAmount: totalAmount.trim(),
          count: Number(count),
          firstDueDate,
          categoryId: categoryId || null,
          paymentMethod,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.installments.form.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.installments.savedToast, variant: "success" });
      router.refresh();
    } catch {
      setError(dict.installments.form.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.installments.form;

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
          <Button type="submit" form="installment-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="installment-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
            label={form.totalAmount}
            placeholder="18,000.00"
            inputMode="decimal"
            value={totalAmount}
            onChange={(event) => setTotalAmount(event.target.value)}
            required
          />
          <Input
            label={form.count}
            type="number"
            min={2}
            max={120}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.firstDueDate}
            type="date"
            value={firstDueDate}
            onChange={(event) => setFirstDueDate(event.target.value)}
            required
          />
          <Select
            label={form.paymentMethod}
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {dict.installments.paymentMethods[method]}
              </option>
            ))}
          </Select>
        </div>

        <Select label={form.category} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">{form.noCategory}</option>
          {sortedCategories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

/* ── Card de plan con cuotas expandibles ─────────────────────────────── */

function InstallmentCard({
  view,
  currency,
  onDelete,
  busy,
}: {
  view: InstallmentCardView;
  currency: CurrencyCode;
  onDelete: () => void;
  busy: boolean;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [payingCuota, setPayingCuota] = useState<number | null>(null);

  const percent = view.count > 0 ? Math.round((view.paidCount / view.count) * 100) : 0;

  async function payCuota(occurrence: OccurrenceView) {
    setPayingCuota(occurrence.number);
    try {
      const response = await fetch("/api/presupuesto/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "payCuota", id: view.id, number: occurrence.number }),
      });
      setPayingCuota(null);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        toast({ title: payload?.message ?? dict.installments.form.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.installments.paidToast, variant: "success" });
      router.refresh();
    } catch {
      setPayingCuota(null);
      toast({ title: dict.installments.form.errors.generic, variant: "danger" });
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold text-primary-950">{view.description}</h3>
            {view.status === "completed" ? (
              <Badge tone="success" dot>
                {dict.installments.paid}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <MoneyValue amount={view.totalMinor} kind="expense" currency={currency} size="md" />
            <span className="font-display font-semibold text-primary-700">
              {view.count} × <MoneyValue amount={view.perInstallmentMinor} kind="expense" currency={currency} size="sm" />
              {!view.perInstallmentEven ? "+" : ""}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-faint">
            <span className="inline-flex items-center gap-1">
              <IconCreditCard size={12} />
              {dict.installments.paymentMethods[view.paymentMethod]}
            </span>
            {view.categoryName ? (
              <>
                <span aria-hidden>·</span>
                <span>{view.categoryName}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <IconCalendar size={12} />
              {dict.installments.ends} {formatDate(view.endDate)}
            </span>
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-xl font-bold tabular-nums text-primary-900">
            {view.paidCount}/{view.count}
          </p>
          <p className="text-xs text-faint">{dict.installments.paidLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <Progress value={percent} tone={percent >= 100 ? "success" : "primary"} size="sm" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
            {dict.installments.paidAmount}
          </dt>
          <dd className="mt-0.5">
            <MoneyValue amount={view.paidMinor} kind="goal" currency={currency} size="sm" />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
            {dict.installments.remainingAmount}
          </dt>
          <dd className="mt-0.5">
            <MoneyValue amount={view.remainingMinor} kind="expense" currency={currency} size="sm" />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-faint">
            {dict.installments.next}
          </dt>
          <dd className="mt-0.5 text-xs font-bold text-text">
            {view.nextDate ? (
              <>
                {formatDate(view.nextDate)}
                <span className="ml-1 text-faint">
                  ({view.nextNumber}/{view.count})
                </span>
              </>
            ) : (
              <span className="text-success">{dict.installments.nextNoDate}</span>
            )}
          </dd>
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button size="sm" variant="ghost" iconRight={<IconChevronDown size={13} className={expanded ? "rotate-180" : ""} />} onClick={() => setExpanded((value) => !value)}>
            {expanded ? dict.installments.hideCuotas : dict.installments.cuotas}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-danger-soft"
            iconLeft={<IconTrash size={13} />}
            disabled={busy}
            onClick={onDelete}
            aria-label={dict.installments.confirmDelete.title}
          />
        </div>
      </dl>

      {expanded ? (
        <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border bg-background/60">
          {view.occurrences.map((occurrence) => (
            <li key={occurrence.number} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold ${
                    occurrence.status === "paid"
                      ? "bg-success-soft text-success-strong"
                      : occurrence.status === "cancelled"
                        ? "bg-background text-faint"
                        : "bg-primary-soft text-primary-700"
                  }`}
                >
                  {occurrence.number}
                </span>
                <span className={`text-xs font-semibold ${occurrence.status === "cancelled" ? "text-faint line-through" : "text-text"}`}>
                  {formatShort(occurrence.date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MoneyValue amount={occurrence.amountMinor} kind="expense" currency={currency} size="sm" />
                {occurrence.status === "paid" ? (
                  <Badge tone="success">{dict.installments.paid}</Badge>
                ) : occurrence.status === "cancelled" ? (
                  <Badge tone="neutral">{dict.installments.cancelled}</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="soft"
                    iconLeft={<IconCheck size={12} />}
                    disabled={payingCuota === occurrence.number}
                    loading={payingCuota === occurrence.number}
                    onClick={() => void payCuota(occurrence)}
                  >
                    {dict.installments.markPaid}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/* ── Cliente principal ───────────────────────────────────────────────── */

export function InstallmentsClient({
  views,
  currency,
  categories,
}: {
  views: InstallmentCardView[];
  currency: CurrencyCode;
  categories: Array<{ id: string; name: string }>;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<InstallmentCardView | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function deletePlan(plan: InstallmentCardView) {
    setDeleting(true);
    try {
      const response = await fetch("/api/presupuesto/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "delete", id: plan.id }),
      });
      setDeleting(false);
      setConfirmDelete(null);
      if (!response.ok) {
        toast({ title: dict.installments.form.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.installments.deletedToast, variant: "success" });
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(null);
      toast({ title: dict.installments.form.errors.generic, variant: "danger" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button iconLeft={<IconPlus size={15} />} onClick={() => setCreateOpen(true)}>
          {dict.installments.new}
        </Button>
      </div>

      {views.length === 0 ? (
        <EmptyState
          icon={<IconCreditCard size={20} />}
          title={dict.installments.empty}
          description={dict.installments.emptyHint}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {views.map((view) => (
            <InstallmentCard
              key={view.id}
              view={view}
              currency={currency}
              busy={deleting && confirmDelete?.id === view.id}
              onDelete={() => setConfirmDelete(view)}
            />
          ))}
        </div>
      )}

      <NewInstallmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        currency={currency}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={dict.installments.confirmDelete.title}
        description={dict.installments.confirmDelete.desc}
        confirmLabel={dict.installments.confirmDelete.confirm}
        tone="danger"
        loading={deleting}
        icon={<IconTrash size={18} />}
        onConfirm={() => {
          if (confirmDelete) void deletePlan(confirmDelete);
        }}
      />
    </div>
  );
}
