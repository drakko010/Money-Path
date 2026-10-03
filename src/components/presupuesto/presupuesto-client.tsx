"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconDownload, IconPlus, IconSettings } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { MoneyValue } from "@/components/ui/money-value";
import { useToast } from "@/components/ui/toast";
import type { CurrencyCode } from "@/config/locales";
import { getDictionary } from "@/lib/i18n";
import {
  PERIOD_IDS,
  type MovementRow,
  type PresupuestoData,
  type PeriodId,
} from "@/lib/presupuesto-shared";
import { CategoriesDialog } from "./categories-dialog";
import { TransactionForm } from "./forms";
import { ImportDialog } from "./import-dialog";

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMAT.format(parsed);
}

/* ── Barra de filtros ────────────────────────────────────────────────── */

function FilterBar({ data }: { data: PresupuestoData }) {
  const dict = getDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = data.tab === "ingresos" ? data.categories.income : data.categories.expense;
  const statuses =
    data.tab === "ingresos" ? ["received", "pending", "cancelled"] : ["paid", "pending", "cancelled"];

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/app/presupuesto?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("p");
    params.delete("cat");
    params.delete("tipo");
    params.delete("estado");
    router.replace(`/app/presupuesto?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label={dict.presupuesto.filters.period}
        value={data.filters.period}
        onChange={(event) => updateParam("p", event.target.value === "this_month" ? "" : event.target.value)}
        className="w-44"
      >
        {PERIOD_IDS.map((period) => (
          <option key={period} value={period}>
            {dict.presupuesto.periods[period as PeriodId]}
          </option>
        ))}
      </Select>

      <Select
        label={dict.presupuesto.filters.category}
        value={data.filters.categoryId}
        onChange={(event) => updateParam("cat", event.target.value)}
        className="w-48"
      >
        <option value="">{dict.presupuesto.filters.allCategories}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>

      {data.tab !== "ingresos" ? (
        <Select
          label={dict.presupuesto.filters.type}
          value={data.filters.kind}
          onChange={(event) => updateParam("tipo", event.target.value)}
          className="w-36"
        >
          <option value="">{dict.presupuesto.filters.allTypes}</option>
          <option value="fixed">{dict.presupuesto.types.fixed}</option>
          <option value="variable">{dict.presupuesto.types.variable}</option>
        </Select>
      ) : null}

      <Select
        label={dict.presupuesto.filters.status}
        value={data.filters.status}
        onChange={(event) => updateParam("estado", event.target.value)}
        className="w-40"
      >
        <option value="">{dict.presupuesto.filters.allStatuses}</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {dict.presupuesto.statuses[status as keyof typeof dict.presupuesto.statuses]}
          </option>
        ))}
      </Select>

      {data.hasActiveFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="pb-2.5 text-xs font-bold text-primary-700 transition-colors hover:text-primary-hover"
        >
          {dict.presupuesto.filters.clear}
        </button>
      ) : null}
    </div>
  );
}

/* ── Lista de movimientos ────────────────────────────────────────────── */

function StatusBadge({ row }: { row: MovementRow }) {
  const dict = getDictionary();
  const tone =
    row.status === "received" || row.status === "paid"
      ? "success"
      : row.status === "pending"
        ? "warning"
        : "neutral";
  return (
    <Badge tone={tone}>
      {dict.presupuesto.statuses[row.status as keyof typeof dict.presupuesto.statuses]}
    </Badge>
  );
}

function MovementList({ data }: { data: PresupuestoData }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<MovementRow | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<MovementRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function runUpdate(row: MovementRow, op: string, successMessage: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/presupuesto/transactions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: row.table, id: row.id, op }),
      });
      setBusy(false);
      if (!response.ok) {
        toast({ title: dict.presupuesto.actions.error, variant: "danger" });
        return;
      }
      toast({ title: successMessage, variant: "success" });
      router.refresh();
    } catch {
      setBusy(false);
      toast({ title: dict.presupuesto.actions.error, variant: "danger" });
    }
  }

  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={<IconPlus size={20} />}
        title={
          data.tab === "ingresos"
            ? dict.presupuesto.list.emptyIngresos
            : dict.presupuesto.list.emptyGastos
        }
        description={dict.presupuesto.list.emptyHint}
        className="mt-4"
      />
    );
  }

  return (
    <>
      <ul className="mt-4 flex flex-col gap-2">
        {data.rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`truncate text-sm font-bold ${row.status === "cancelled" ? "text-faint line-through" : "text-text"}`}>
                  {row.description}
                </p>
                <StatusBadge row={row} />
                {row.isRecurring ? <Badge tone="primary">{dict.presupuesto.list.recurring}</Badge> : null}
                {row.table === "income" && row.status === "pending" ? (
                  <Badge tone="info">{dict.presupuesto.list.future}</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-faint">
                <span>{formatDate(row.date)}</span>
                <span aria-hidden>·</span>
                <span>{row.categoryName ?? dict.presupuesto.list.noCategory}</span>
                {row.table === "expenses" && row.kind ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{dict.presupuesto.types[row.kind]}</span>
                  </>
                ) : null}
              </p>
              {row.note ? <p className="mt-0.5 truncate text-xs text-muted">{row.note}</p> : null}
            </div>

            <div className="flex items-center gap-2">
              <MoneyValue
                amount={row.amountMinor}
                kind={row.table === "income" ? "income" : "expense"}
                currency={data.currency as CurrencyCode}
              />
              {row.status === "pending" ? (
                <Button
                  size="sm"
                  variant="soft"
                  disabled={busy}
                  onClick={() =>
                    runUpdate(
                      row,
                      row.table === "income" ? "markReceived" : "markPaid",
                      row.table === "income" ? dict.presupuesto.actions.received : dict.presupuesto.actions.paid,
                    )
                  }
                >
                  {row.table === "income"
                    ? dict.presupuesto.actions.markReceived
                    : dict.presupuesto.actions.markPaid}
                </Button>
              ) : null}
              {row.status !== "cancelled" ? (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmCancel(row)}>
                  {dict.presupuesto.actions.cancelMovement}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" disabled={busy} onClick={() => setConfirmDelete(row)}>
                {dict.presupuesto.actions.delete}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={dict.presupuesto.confirmDelete.title}
        description={dict.presupuesto.confirmDelete.desc}
        confirmLabel={dict.presupuesto.confirmDelete.confirm}
        tone="danger"
        loading={busy}
        onConfirm={() => {
          if (confirmDelete) {
            void runUpdate(confirmDelete, "delete", dict.presupuesto.actions.deleted);
            setConfirmDelete(null);
          }
        }}
      />
      <ConfirmDialog
        open={confirmCancel !== null}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title={dict.presupuesto.confirmCancel.title}
        description={dict.presupuesto.confirmCancel.desc}
        confirmLabel={dict.presupuesto.confirmCancel.confirm}
        tone="primary"
        loading={busy}
        onConfirm={() => {
          if (confirmCancel) {
            void runUpdate(confirmCancel, "cancel", dict.presupuesto.actions.cancelled);
            setConfirmCancel(null);
          }
        }}
      />
    </>
  );
}

/* ── Cliente principal ───────────────────────────────────────────────── */

export function PresupuestoClient({ data }: { data: PresupuestoData }) {
  const dict = getDictionary();
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const isIncomeTab = data.tab === "ingresos";
  const defaultKind = data.tab === "fijos" ? "fixed" : "variable";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <FilterBar data={data} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            iconLeft={<IconPlus size={15} />}
            onClick={() => setFormOpen(true)}
          >
            {isIncomeTab ? dict.presupuesto.actions.newIncome : dict.presupuesto.actions.newExpense}
          </Button>
          <Button variant="secondary" iconLeft={<IconDownload size={15} />} onClick={() => setImportOpen(true)}>
            {dict.presupuesto.actions.import}
          </Button>
          <Button variant="secondary" iconLeft={<IconSettings size={15} />} onClick={() => setCategoriesOpen(true)}>
            {dict.presupuesto.actions.categories}
          </Button>
        </div>
      </div>

      <p className="text-xs font-semibold text-faint">
        {dict.presupuesto.filters.results.replace("{count}", String(data.rows.length))}
      </p>

      <MovementList data={data} />

      <TransactionForm
        mode={isIncomeTab ? "income" : "expense"}
        open={formOpen}
        onOpenChange={setFormOpen}
        currency={data.currency as CurrencyCode}
        categories={isIncomeTab ? data.categories.income : data.categories.expense}
        defaultKind={defaultKind}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        incomeCategories={data.categories.income}
        expenseCategories={data.categories.expense}
      />
    </div>
  );
}
