"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  IconCheck,
  IconPlus,
  IconSparkles,
  IconTarget,
  IconTrash,
} from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatMoney } from "@/lib/money";
import { GOAL_CATEGORIES, type GoalCategory } from "@/lib/goals-shared";
import type { GoalView, GoalsData } from "@/lib/goals";

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

/* ── Nueva meta ──────────────────────────────────────────────────────── */

function NewGoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory>("otro");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState(2);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("otro");
      setTargetAmount("");
      setCurrentAmount("");
      setTargetDate("");
      setPriority(2);
      setDescription("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: "create",
          name: name.trim(),
          category,
          targetAmount: targetAmount.trim(),
          currentAmount: currentAmount.trim(),
          targetDate: targetDate || null,
          priority,
          description: description.trim(),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.goalsModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.goalsModule.form.save, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.goalsModule.errors.generic);
      setSaving(false);
    }
  }

  const form = dict.goalsModule.form;

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
          <Button type="submit" form="goal-form" loading={saving}>
            {form.save}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
          <Select label={form.category} value={category} onChange={(event) => setCategory(event.target.value as GoalCategory)}>
            {GOAL_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {dict.goalsModule.categories[option]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.targetAmount}
            placeholder="25,000.00"
            inputMode="decimal"
            value={targetAmount}
            onChange={(event) => setTargetAmount(event.target.value)}
            required
          />
          <Input
            label={form.currentAmount}
            placeholder="0.00"
            inputMode="decimal"
            value={currentAmount}
            onChange={(event) => setCurrentAmount(event.target.value)}
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label={form.targetDate}
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
          <Select label={form.priority} value={String(priority)} onChange={(event) => setPriority(Number(event.target.value))}>
            <option value="1">{dict.goalsModule.priorityLabels["1"]}</option>
            <option value="2">{dict.goalsModule.priorityLabels["2"]}</option>
            <option value="3">{dict.goalsModule.priorityLabels["3"]}</option>
          </Select>
        </div>

        <Input
          label={form.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={300}
        />
      </form>
    </Modal>
  );
}

/* ── Aporte ──────────────────────────────────────────────────────────── */

function ContributeDialog({
  goal,
  onOpenChange,
}: {
  goal: GoalView | null;
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
    if (goal) {
      setAmount("");
      setNote("");
      setError(null);
      setSaving(false);
    }
  }, [goal]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!goal) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "contribute", id: goal.id, amount: amount.trim(), note: note.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.goalsModule.errors.generic);
        setSaving(false);
        return;
      }
      onOpenChange(false);
      toast({ title: dict.goalsModule.contribute.saved, variant: "success" });
      router.refresh();
      setSaving(false);
    } catch {
      setError(dict.goalsModule.errors.generic);
      setSaving(false);
    }
  }

  if (!goal) return null;

  return (
    <Modal
      open={goal !== null}
      onOpenChange={onOpenChange}
      title={dict.goalsModule.contribute.title.replace("{name}", goal.name)}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button type="submit" form="contribute-form" loading={saving}>
            {dict.goalsModule.contribute.save}
          </Button>
        </>
      }
    >
      <form id="contribute-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error ? <Alert variant="danger" title={error} /> : null}
        <Input
          label={dict.goalsModule.contribute.amount}
          placeholder="1,000.00"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Input
          label={dict.goalsModule.contribute.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
        />
      </form>
    </Modal>
  );
}

/* ── Card de meta ────────────────────────────────────────────────────── */

function GoalCard({
  goal,
  currency,
  onContribute,
  onDelete,
  busy,
}: {
  goal: GoalView;
  currency: CurrencyCode;
  onContribute: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const dict = getDictionary();
  const achieved = goal.status === "achieved";

  const forecastText = achieved
    ? dict.goalsModule.forecast.achieved
    : goal.forecast.months === null
      ? null
      : dict.goalsModule.forecast.onTrack.replace(
          "{when}",
          goal.forecast.months <= 1
            ? dict.goalsModule.forecast.thisMonth
            : dict.goalsModule.forecast.monthsValue.replace("{months}", String(goal.forecast.months)),
        );

  return (
    <Card className={achieved ? "border-success/40" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate">{goal.name}</CardTitle>
            <Badge tone="neutral">{dict.goalsModule.categories[goal.category]}</Badge>
            <Badge tone={goal.priority === 1 ? "danger" : goal.priority === 2 ? "warning" : "neutral"}>
              {dict.goalsModule.priorityLabels[String(goal.priority) as "1" | "2" | "3"]}
            </Badge>
            {achieved ? (
              <Badge tone="success" dot>
                {dict.goalsModule.statusLabels.achieved}
              </Badge>
            ) : null}
          </div>
          {goal.description ? (
            <CardDescription className="mt-1 line-clamp-1">{goal.description}</CardDescription>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={dict.goalsModule.confirmDelete.title}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <IconTrash size={15} />
        </button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-faint">
              {dict.goalsModule.plan.remaining}
            </p>
            <MoneyValue className="mt-1" amount={goal.remainingMinor} kind="goal" currency={currency} size="lg" />
          </div>
          <p className="font-display text-xl font-bold tabular-nums text-primary-900">{goal.percent}%</p>
        </div>

        <Progress value={goal.percent} tone={achieved ? "success" : "primary"} size="sm" />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {dict.goalsModule.plan.perMonth}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-text">
              {goal.perMonthMinor !== null ? formatMoney(goal.perMonthMinor, { currency }) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {dict.goalsModule.plan.perWeek}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-text">
              {goal.perWeekMinor !== null ? formatMoney(goal.perWeekMinor, { currency }) : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
          <span>
            {dict.goalsModule.plan.deadline}:{" "}
            {goal.targetDate ? (
              <span className="font-semibold text-text">{formatDate(goal.targetDate)}</span>
            ) : (
              dict.goalsModule.plan.noDeadline
            )}
          </span>
          <span>{dict.goalsModule.contributionsCount.replace("{count}", String(goal.contributionsCount))}</span>
        </div>

        {forecastText ? (
          <p className="flex items-start gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-primary-800">
            <IconSparkles size={14} className="mt-0.5 shrink-0 text-accent-500" />
            {forecastText}
          </p>
        ) : !achieved ? (
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
            <IconSparkles size={13} className="mt-0.5 shrink-0 text-accent-500" />
            {dict.goalsModule.forecast.noPace}
          </p>
        ) : null}

        {!achieved ? (
          <Button onClick={onContribute} iconLeft={<IconPlus size={14} />} variant="soft">
            {dict.goalsModule.contributeButton}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <IconCheck size={16} /> {dict.goalsModule.forecast.achieved}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Módulo completo ─────────────────────────────────────────────────── */

export function GoalsModule({ data }: { data: GoalsData }) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();
  const currency = data.currency;

  const [createOpen, setCreateOpen] = useState(false);
  const [contributing, setContributing] = useState<GoalView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GoalView | null>(null);
  const [busy, setBusy] = useState(false);

  async function deleteGoal(goal: GoalView) {
    setBusy(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "delete", id: goal.id }),
      });
      setBusy(false);
      setConfirmDelete(null);
      if (!response.ok) {
        toast({ title: dict.goalsModule.errors.generic, variant: "danger" });
        return;
      }
      toast({ title: dict.goalsModule.confirmDelete.confirm, variant: "success" });
      router.refresh();
    } catch {
      setBusy(false);
      setConfirmDelete(null);
      toast({ title: dict.goalsModule.errors.generic, variant: "danger" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.goalsModule.summary.active}</p>
          <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-primary-900">
            {data.summary.activeCount}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.goalsModule.summary.target}</p>
          <MoneyValue className="mt-1.5" amount={data.summary.totalTargetMinor} kind="goal" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.goalsModule.summary.saved}</p>
          <MoneyValue className="mt-1.5" amount={data.summary.totalCurrentMinor} kind="investment" currency={currency} size="lg" />
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">{dict.goalsModule.summary.achieved}</p>
          <p className="mt-1.5 font-display text-xl font-bold tabular-nums text-success">
            {data.summary.achievedCount}
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button iconLeft={<IconPlus size={15} />} onClick={() => setCreateOpen(true)}>
          {dict.goalsModule.new}
        </Button>
      </div>

      {data.goals.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={20} />}
          title={dict.goalsModule.empty}
          description={dict.goalsModule.emptyHint}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              busy={busy}
              onContribute={() => setContributing(goal)}
              onDelete={() => setConfirmDelete(goal)}
            />
          ))}
        </div>
      )}

      <NewGoalDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ContributeDialog goal={contributing} onOpenChange={(open) => !open && setContributing(null)} />

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={dict.goalsModule.confirmDelete.title}
        description={dict.goalsModule.confirmDelete.desc}
        confirmLabel={dict.goalsModule.confirmDelete.confirm}
        tone="danger"
        loading={busy}
        icon={<IconTrash size={18} />}
        onConfirm={() => {
          if (confirmDelete) void deleteGoal(confirmDelete);
        }}
      />
    </div>
  );
}
