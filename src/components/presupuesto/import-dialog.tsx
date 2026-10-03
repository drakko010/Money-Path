"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getDictionary } from "@/lib/i18n";

const MAX_ROWS = 500;

interface CsvRow {
  date: string;
  description: string;
  amount: string;
  type: string;
  category: string;
}

/** Parse simples de CSV (sin comillas complejas): fecha,descripcion,monto,tipo,categoria. */
function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: CsvRow[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("fecha,") || lower.startsWith("date,")) continue;
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 3) continue;
    rows.push({
      date: parts[0] ?? "",
      description: parts[1] ?? "",
      amount: parts[2] ?? "",
      type: parts[3] ?? "",
      category: parts.length > 4 ? parts.slice(4).join(",") : "",
    });
  }
  return rows.slice(0, MAX_ROWS);
}

/** Importación de estados de cuenta en CSV (sin integración bancaria). */
export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const dict = getDictionary();
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const content = await file.text();
      setText(content);
      setError(null);
    } catch {
      setError(dict.presupuesto.form.errors.generic);
    }
  }

  async function handleImport() {
    setError(null);
    const rows = parseCsv(text);
    if (rows.length === 0) {
      setError(dict.presupuesto.import.empty);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/presupuesto/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const payload = (await response.json().catch(() => null)) as {
        imported?: number;
        duplicates?: number;
        errors?: number;
        message?: string;
      } | null;
      if (!response.ok || !payload) {
        setError(payload?.message ?? dict.presupuesto.form.errors.generic);
        setSubmitting(false);
        return;
      }
      setResult({
        imported: payload.imported ?? 0,
        duplicates: payload.duplicates ?? 0,
        errors: payload.errors ?? 0,
      });
      setSubmitting(false);
      if ((payload.imported ?? 0) > 0) router.refresh();
    } catch {
      setError(dict.presupuesto.form.errors.generic);
      setSubmitting(false);
    }
  }

  function close(next: boolean) {
    if (!next) {
      setText("");
      setFileName(null);
      setError(null);
      setResult(null);
      setSubmitting(false);
    }
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title={dict.presupuesto.import.title}
      description={dict.presupuesto.import.desc}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => close(false)} disabled={submitting}>
            {dict.presupuesto.form.cancel}
          </Button>
          <Button onClick={handleImport} loading={submitting}>
            {dict.presupuesto.import.submit}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert variant="danger" title={error} /> : null}
        {result ? (
          <Alert
            variant={result.imported > 0 ? "success" : "info"}
            title={
              result.imported > 0
                ? dict.presupuesto.import.resultOk
                    .replace("{imported}", String(result.imported))
                    .replace("{duplicates}", String(result.duplicates))
                    .replace("{errors}", String(result.errors))
                : dict.presupuesto.import.resultNone
            }
          />
        ) : null}

        <div className="rounded-xl border border-border bg-background p-3.5 text-xs">
          <p className="font-bold text-text">{dict.presupuesto.import.templateLabel}</p>
          <code className="mt-1 block rounded bg-elevated px-2 py-1.5 font-mono text-primary-800">
            {dict.presupuesto.import.template}
          </code>
          <p className="mt-2 leading-relaxed text-muted">{dict.presupuesto.import.rules}</p>
        </div>

        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setResult(null);
          }}
          placeholder={dict.presupuesto.import.placeholder}
          rows={7}
          className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 font-mono text-xs text-text outline-none transition-colors placeholder:text-faint focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            {dict.presupuesto.import.chooseFile}
          </Button>
          {fileName ? <span className="text-xs text-muted">{fileName}</span> : null}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <p className="text-[11px] leading-relaxed text-faint">
          {dict.presupuesto.import.bankNote}
        </p>
      </div>
    </Modal>
  );
}
