import type { ReactNode } from "react";

/**
 * Renderizador del Markdown simplificado de la Academia (Etapa 19).
 *
 * Soporta exactamente lo que usa el catálogo: `## Título`, listas con `- `,
 * listas numeradas (`1. `), notas con `> `, párrafos y énfasis `**texto**`.
 * Es propio (sin dependencias) para mantener el bundle ligero y el estilo
 * del Design System, igual que los gráficos de la Etapa 6.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "note"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] };

/** Convierte el cuerpo almacenado en una lista de bloques tipados. */
export function parseAcademyBody(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let buffer: string[] = [];
  let listType: "list" | "steps" | null = null;

  const flushParagraph = () => {
    if (buffer.length > 0) {
      blocks.push({ type: "paragraph", text: buffer.join(" ").trim() });
      buffer = [];
    }
  };
  const flushList = () => {
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "note", text: line.slice(2).trim() });
      continue;
    }

    const bullet = /^[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === "list") last.items.push(bullet[1]);
      else blocks.push({ type: "list", items: [bullet[1]] });
      listType = "list";
      continue;
    }

    const step = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (step) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === "steps") last.items.push(step[2]);
      else blocks.push({ type: "steps", items: [step[2]] });
      listType = "steps";
      continue;
    }

    if (listType) flushList();
    buffer.push(line);
  }

  flushParagraph();
  return blocks;
}

/** Cuerpo educativo renderizado con la tipografía del producto. */
export function AcademyRichText({ body }: { body: string | null }) {
  if (!body || body.trim().length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Este contenido todavía no tiene el cuerpo publicado.
      </p>
    );
  }

  const blocks = parseAcademyBody(body);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.type === "heading") {
          return (
            <h2
              key={key}
              className="mt-2 font-display text-base font-bold tracking-tight text-primary-900 first:mt-0"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "note") {
          return (
            <p
              key={key}
              className="rounded-xl border-l-4 border-accent-400 bg-accent-50/70 px-4 py-3 text-sm leading-relaxed text-text"
            >
              {inline(block.text, key)}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={key} className="flex flex-col gap-2">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="flex gap-2.5 text-sm leading-relaxed text-text">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                  <span>{inline(item, `${key}-${itemIndex}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "steps") {
          return (
            <ol key={key} className="flex flex-col gap-2.5">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="flex gap-3 text-sm leading-relaxed text-text">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-50 font-display text-xs font-bold text-primary-700">
                    {itemIndex + 1}
                  </span>
                  <span>{inline(item, `${key}-${itemIndex}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key} className="text-sm leading-relaxed text-text">
            {inline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
