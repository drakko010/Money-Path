"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconPause, IconPlay, IconPlus, IconTrash } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { MoneyValue } from "@/components/ui/money-value";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { UI_FREQUENCIES, type RecurringFrequency } from "@/lib/recurring-shared";

export interface RecurringView {
  id: string;
  kind: "income" | "expense";
  description: string;
  amountMinor: number;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextOccurrence: string;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
}

interface CategoriesPayload {
  income: Array<{ id: string; name: string }>;
  expense: Array<{ id: string; name: string }>;
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

/* ── Formulario crear/editar con alcance ─────────────────────────────── */

type Scope = "one" | "following" | "all";

function RecurringForm({
  open,
  onOpenChange,
  mode,
  template,
  currency,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  template: RecurringView | null;
  currency: CurrencyCode;
  categories: CategoriesPayload;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [refDate, setRefDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (mode === "edit" && template) {
      setKind(template.kind);
      setDescription(template.description);
      setAmount(String(template.amountMinor / 100));
      setCategoryId(template.categoryId ?? "");
      setFrequency(template.frequency);
      setStartDate(template.startDate);
      setEndDate(template.endDate ?? "");
      setScope("all");
      setRefDate(template.nextOccurrence);
    } else {
      setKind("expense");
      setDescription("");
      setAmount("");
      setCategoryId("");
      setFrequency("monthly");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setScope("all");
      setRefDate("");
    }
  }, [open, mode, template]);

  const categoryOptions = kind === "income" ? categories.income : categories.expense;
  const sortedOptions = useMemo(
    () => [...categoryOptions].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categoryOptions],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const errors = dict.recurring.form.errors;

    if (!description.trim()) return setError(errors.description);
    if (!amount.trim()) return setError(errors.amount);
    if (!startDate) return setError(errors.startDate);
    if (endDate && endDate < startDate) return setError(errors.endDate);

    setSaving(true);
    try {
      const payload =
        mode === "create"
          ? {
              op: "create",
              kind,
              description: description.trim(),
              amount: amount.trim(),
              categoryId: categoryId || null,
              frequency,
              startDate,
              endDate: endDate || null,
            }
          : {
              op: "update",
              id: template?.id,
              scope,
              refDate: scope === "all" ? undefined : refDate || template?.nextOccurrence,
              description: description.trim(),
              amount: amount.trim(),
              categoryId: categoryId || null,
              frequency,
              endDate: endDate || null,
            };

      const response = await fetch("/api/presupuesto/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payloadError?.message ?? errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.recurring.actions.saved, variant: "success" });
      router.refresh();
    } catch {
      setError(errors.generic);
      setSaving(false);
    }
  }

  const form = dict.recurring.form;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? form.createTitle : form.editTitle}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {form.cancel}
          </Button>
          <Button type="submit" form="recurring-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="recurring-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}

        {mode === "create" ? (
          <Select label={form.kind} value={kind} onChange={(event) => { setKind(event.target.value as "income" | "expense"); setCategoryId(""); }}>
            <option value="income">{dict.recurring.kinds.income}</option>
            <option value="expense">{dict.recurring.kinds.expense}</option>
          </Select>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.description}
            placeholder={form.descriptionPlaceholder}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={200}
            required
          />
          <Input
            label={form.amount}
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Select label={form.category} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{form.noCategory}</option>
            {sortedOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Select label={form.frequency} value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringFrequency)}>
            {UI_FREQUENCIES.map((option) => (
              <option key={option} value={option}>
                {form.frequencies[option]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.startDate}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={mode === "edit"}
            required
          />
          <Input
            label={form.endDate}
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        {mode === "edit" ? (
          <fieldset className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3.5">
            <legend className="px-1 text-xs font-bold text-text">{form.scope}</legend>
            {(["one", "following", "all"] as Scope[]).map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === option}
                  onChange={() => setScope(option)}
                  className="h-4 w-4 accent-[#14656d]"
                />
                <span className="font-semibold text-text">{form.scopes[option]}</span>
              </label>
            ))}
            {scope !== "all" ? (
              <div className="mt-1 flex flex-col gap-1.5">
                <Input
                  label={form.refDate}
                  type="date"
                  value={refDate || template?.nextOccurrence || ""}
                  onChange={(event) => setRefDate(event.target.value)}
                />
                {scope === "following" ? (
                  <p className="text-[11px] leading-relaxed text-faint">{form.scopeFollowingHint}</p>
                ) : null}
              </div>
            ) : null}
          </fieldset>
        ) : null}
      </form>
    </Modal>
  );
}

/* ── Gestor principal ────────────────────────────────────────────────── */

export function RecurringManager({
  templates,
  currency,
  categories,
}: {
  templates: RecurringView[];
  currency: CurrencyCode;
  categories: CategoriesPayload;
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecurringView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function simpleOp(template: RecurringView, op: "pause" | "resume" | "delete", message: string) {
    setBusyId(template.id);
    try {
      const response = await fetch("/api/presupuesto/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, id: template.id }),
      });
      setBusyId(null);
      if (!response.ok) {
        toast({ title: dict.recurring.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: message, variant: "success" });
      router.refresh();
    } catch {
      setBusyId(null);
      toast({ title: dict.recurring.errors.generic, variant: "danger" });
    }
  }

  const statusTone = (status: string) =>
    status === "active" ? "success" : status === "paused" ? "warning" : "neutral";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          iconLeft={<IconPlus size={15} />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {dict.recurring.new}
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<IconPlus size={20} />}
          title={dict.recurring.empty}
          description={dict.recurring.emptyHint}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-text">{template.description}</p>
                  <Badge tone={template.kind === "income" ? "success" : "danger"}>
                    {dict.recurring.kinds[template.kind]}
                  </Badge>
                  <Badge tone={statusTone(template.status)} dot>
                    {dict.recurring.statuses[template.status as keyof typeof dict.recurring.statuses] ?? template.status}
                  </Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-faint">
                  <span>{dict.recurring.form.frequencies[template.frequency] ?? template.frequency}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {dict.recurring.since} {formatDate(template.startDate)}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {template.endDate
                      ? `${dict.recurring.until} ${formatDate(template.endDate)}`
                      : dict.recurring.noEnd}
                  </span>
                  {template.categoryName ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{template.categoryName}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {dict.recurring.next}: <span className="font-semibold">{formatDate(template.nextOccurrence)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MoneyValue
                  amount={template.amountMinor}
                  kind={template.kind === "income" ? "income" : "expense"}
                  currency={currency}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === template.id}
                  onClick={() => {
                    setEditing(template);
                    setFormOpen(true);
                  }}
                >
                  {dict.recurring.actions.edit}
                </Button>
                {template.status === "active" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft={<IconPause size={13} />}
                    disabled={busyId === template.id}
                    onClick={() => simpleOp(template, "pause", dict.recurring.actions.paused)}
                  >
                    {dict.recurring.actions.pause}
                  </Button>
                ) : template.status === "paused" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft={<IconPlay size={13} />}
                    disabled={busyId === template.id}
                    onClick={() => simpleOp(template, "resume", dict.recurring.actions.resumed)}
                  >
                    {dict.recurring.actions.resume}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger-soft"
                  iconLeft={<IconTrash size={13} />}
                  disabled={busyId === template.id}
                  onClick={() => setConfirmDelete(template)}
                >
                  {dict.recurring.actions.delete}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        template={editing}
        currency={currency}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={dict.recurring.confirmDelete.title}
        description={dict.recurring.confirmDelete.desc}
        confirmLabel={dict.recurring.confirmDelete.confirm}
        tone="danger"
        loading={busyId !== null}
        icon={<IconTrash size={18} />}
        onConfirm={() => {
          if (confirmDelete) {
            setConfirmDelete(null);
            void simpleOp(confirmDelete, "delete", dict.recurring.actions.deleted);
          }
        }}
      />
    </div>
  );
}
