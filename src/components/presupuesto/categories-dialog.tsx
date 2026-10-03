"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getDictionary } from "@/lib/i18n";
import type { CategoryView } from "@/lib/presupuesto-shared";

/** Gestión de categorías personalizadas (crear / archivar). */
export function CategoriesDialog({
  open,
  onOpenChange,
  incomeCategories,
  expenseCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeCategories: CategoryView[];
  expenseCategories: CategoryView[];
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [expenseKind, setExpenseKind] = useState<"fixed" | "variable">("variable");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(dict.presupuesto.categories.invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/presupuesto/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "create", kind, name: trimmed, expenseKind }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.presupuesto.form.errors.generic);
        setSaving(false);
        return;
      }
      setName("");
      setSaving(false);
      toast({ title: dict.presupuesto.categories.created, variant: "success" });
      router.refresh();
    } catch {
      setError(dict.presupuesto.form.errors.generic);
      setSaving(false);
    }
  }

  async function archiveWith(kindValue: "income" | "expense", id: string) {
    const response = await fetch("/api/presupuesto/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "archive", kind: kindValue, id }),
    });
    if (response.ok) {
      toast({ title: dict.presupuesto.categories.archived, variant: "success" });
      router.refresh();
    } else {
      toast({ title: dict.presupuesto.form.errors.generic, variant: "danger" });
    }
  }

  function CategoryList({
    title,
    items,
    kindValue,
  }: {
    title: string;
    items: CategoryView[];
    kindValue: "income" | "expense";
  }) {
    return (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{title}</p>
        <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-text">{category.name}</span>
                {category.kind ? (
                  <Badge tone={category.kind === "fixed" ? "primary" : "neutral"}>
                    {dict.presupuesto.types[category.kind]}
                  </Badge>
                ) : null}
                {category.isSystem ? <Badge tone="outline">{dict.presupuesto.categories.system}</Badge> : null}
              </span>
              <button
                type="button"
                onClick={() => {
                  // archivar usa el kind de la sección correspondiente
                  void archiveWith(kindValue, category.id);
                }}
                className="shrink-0 text-xs font-bold text-muted transition-colors hover:text-danger"
              >
                {dict.presupuesto.categories.archive}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={dict.presupuesto.categories.title}
      description={dict.presupuesto.categories.desc}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Input
            label={dict.presupuesto.categories.placeholder}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            maxLength={60}
          />
          <Select label={dict.presupuesto.form.category} value={kind} onChange={(event) => setKind(event.target.value as "income" | "expense")}>
            <option value="income">{dict.presupuesto.tabs.ingresos}</option>
            <option value="expense">{dict.presupuesto.tabs.fijos}/{dict.presupuesto.tabs.variables}</option>
          </Select>
          {kind === "expense" ? (
            <Select label={dict.presupuesto.categories.typeLabel} value={expenseKind} onChange={(event) => setExpenseKind(event.target.value as "fixed" | "variable")}>
              <option value="fixed">{dict.presupuesto.types.fixed}</option>
              <option value="variable">{dict.presupuesto.types.variable}</option>
            </Select>
          ) : null}
          <Button onClick={create} loading={saving}>
            {dict.presupuesto.categories.create}
          </Button>
        </div>

        <CategoryList
          title={dict.presupuesto.categories.incomeSection}
          items={incomeCategories}
          kindValue="income"
        />
        <CategoryList
          title={dict.presupuesto.categories.expenseSection}
          items={expenseCategories}
          kindValue="expense"
        />
      </div>
    </Modal>
  );
}
