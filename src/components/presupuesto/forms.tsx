"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import { getCurrencyConfig } from "@/config/locales";
import type { CategoryView } from "@/lib/presupuesto-shared";

const RECURRENCE_OPTIONS = ["none", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TransactionFormProps {
  mode: "income" | "expense";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
  categories: CategoryView[];
  defaultKind?: "fixed" | "variable";
}

/** Formulario de nuevo ingreso / nuevo gasto (Etapa 7). */
export function TransactionForm({
  mode,
  open,
  onOpenChange,
  currency,
  categories,
  defaultKind = "variable",
}: TransactionFormProps) {
  const dict = getDictionary();
  const router = useRouter();
  const symbol = getCurrencyConfig(currency).symbol;

  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recurrence, setRecurrence] = useState<string>("none");
  const [isFuture, setIsFuture] = useState(false);
  const [kind, setKind] = useState<"fixed" | "variable">(defaultKind);
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(todayIso());
      setDescription("");
      setAmount("");
      setCategoryId("");
      setRecurrence("none");
      setIsFuture(false);
      setKind(defaultKind);
      setStatus("paid");
      setNote("");
      setError(null);
      setSaving(false);
    }
  }, [open, defaultKind]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    if (mode === "expense") {
      const category = categories.find((entry) => entry.id === id);
      if (category?.kind) setKind(category.kind);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const e = dict.presupuesto.form.errors;
    if (!date) return setError(e.date);
    if (!description.trim()) return setError(e.description);
    if (!amount.trim()) return setError(e.amount);

    setSaving(true);
    try {
      const response = await fetch("/api/presupuesto/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: mode === "income" ? "income" : "expenses",
          date,
          description: description.trim(),
          amount: amount.trim(),
          categoryId: categoryId || null,
          recurrence: mode === "income" ? recurrence : undefined,
          isFuture: mode === "income" ? isFuture : undefined,
          kind: mode === "expense" ? kind : undefined,
          status: mode === "expense" ? status : undefined,
          note: mode === "expense" ? note.trim() : undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? e.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError(dict.presupuesto.form.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.presupuesto.form;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "income" ? form.incomeTitle : form.expenseTitle}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {form.cancel}
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.date}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          <Input
            label={form.amount}
            placeholder="0.00"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            iconLeft={<span className="text-sm font-bold text-primary-700">{symbol}</span>}
            required
          />
        </div>

        <Input
          label={form.description}
          placeholder={form.descriptionPlaceholder}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={200}
          required
        />

        <Select
          label={form.category}
          value={categoryId}
          onChange={(event) => handleCategoryChange(event.target.value)}
        >
          <option value="">{form.noCategory}</option>
          {sortedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        {mode === "income" ? (
          <>
            <Select
              label={form.recurrence}
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "none"
                    ? form.recurrenceNone
                    : form.frequencies[option as keyof typeof form.frequencies]}
                </option>
              ))}
            </Select>
            <Checkbox
              label={form.future}
              description={form.futureHint}
              checked={isFuture}
              onCheckedChange={setIsFuture}
            />
          </>
        ) : (
          <>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Select label={form.type} value={kind} onChange={(event) => setKind(event.target.value as "fixed" | "variable")}>
                <option value="fixed">{dict.presupuesto.types.fixed}</option>
                <option value="variable">{dict.presupuesto.types.variable}</option>
              </Select>
              <Select label={form.status} value={status} onChange={(event) => setStatus(event.target.value as "paid" | "pending")}>
                <option value="paid">{dict.presupuesto.statuses.paid}</option>
                <option value="pending">{dict.presupuesto.statuses.pending}</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-note" className="text-xs font-bold text-text">
                {form.note}
              </label>
              <textarea
                id="expense-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={form.notePlaceholder}
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-faint focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
