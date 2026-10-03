"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconSettings } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { getDictionary } from "@/lib/i18n";
import type { IndicatorId } from "@/lib/dashboard";

/**
 * Personalización del dashboard: el usuario elige qué indicadores ver.
 * Se persiste en `user_settings` vía `/api/dashboard/preferences`.
 */
export function CustomizeDashboard({
  indicatorIds,
  visible,
}: {
  indicatorIds: readonly IndicatorId[];
  visible: IndicatorId[];
}) {
  const dict = getDictionary();
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<IndicatorId>>(new Set(visible));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(visible));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(id: IndicatorId) {
    setError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) {
      setError(dict.dashboard.customize.minOne);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: Array.from(selected) }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? dict.dashboard.customize.saveError);
        setSaving(false);
        return;
      }
      setOpen(false);
      setSaving(false);
      toast({ title: dict.dashboard.customize.saved, variant: "success" });
      router.refresh();
    } catch {
      setSaving(false);
      setError(dict.dashboard.customize.saveError);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" iconLeft={<IconSettings size={14} />} onClick={() => setOpen(true)}>
        {dict.dashboard.personalize}
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={dict.dashboard.customize.title}
        description={dict.dashboard.customize.desc}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              {dict.dashboard.customize.cancel}
            </Button>
            <Button onClick={save} loading={saving}>
              {dict.dashboard.customize.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5 py-1">
          {indicatorIds.map((id) => (
            <Switch
              key={id}
              label={dict.dashboard.indicators[id]}
              checked={selected.has(id)}
              onCheckedChange={() => toggle(id)}
            />
          ))}
          {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
