import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconAlertTriangle,
  IconTarget,
  IconTrendingUp,
  IconWallet,
} from "@/components/icons";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyValue, Sparkline } from "@/components/ui/money-value";
import { toMinorUnits } from "@/lib/money";
import { Showcase } from "./showcase";

export const metadata = {
  title: "Design System — Money Path",
  description:
    "Identidad visual y sistema de componentes de Money Path: tokens, componentes y patrones financieros.",
};

interface Swatch {
  token: string;
  name: string;
  hex: string;
  textOnSwatch?: "light" | "dark";
}

function SwatchGroup({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-faint">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {swatches.map((swatch) => (
          <div
            key={swatch.token}
            className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"
          >
            <div
              className="flex h-14 items-end p-2"
              style={{ backgroundColor: swatch.hex }}
            >
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  swatch.textOnSwatch === "light" ? "text-white/90" : "text-primary-950/80"
                }`}
              >
                {swatch.hex}
              </span>
            </div>
            <div className="px-2.5 py-2">
              <p className="text-[11px] font-bold text-text">{swatch.name}</p>
              <p className="font-mono text-[10px] text-faint">{swatch.token}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CORE_SWATCHES: Swatch[] = [
  { token: "--color-primary", name: "Primary", hex: "#14656d", textOnSwatch: "light" },
  { token: "--color-primary-hover", name: "Primary hover", hex: "#0f5159", textOnSwatch: "light" },
  { token: "--color-background", name: "Background", hex: "#f4f3ee", textOnSwatch: "dark" },
  { token: "--color-surface", name: "Surface", hex: "#fcfbf8", textOnSwatch: "dark" },
  { token: "--color-elevated", name: "Surface elevated", hex: "#fefdfa", textOnSwatch: "dark" },
  { token: "--color-text", name: "Text", hex: "#16262b", textOnSwatch: "light" },
  { token: "--color-muted", name: "Muted text", hex: "#54656b", textOnSwatch: "light" },
  { token: "--color-border", name: "Border", hex: "#e4e1d5", textOnSwatch: "dark" },
];

const STATE_SWATCHES: Swatch[] = [
  { token: "--color-success", name: "Success", hex: "#1c8a56", textOnSwatch: "light" },
  { token: "--color-warning", name: "Warning", hex: "#a8690c", textOnSwatch: "light" },
  { token: "--color-danger", name: "Danger", hex: "#c03d36", textOnSwatch: "light" },
  { token: "--color-info", name: "Info", hex: "#1f6e96", textOnSwatch: "light" },
  { token: "--color-accent-500", name: "Accent (cobre)", hex: "#c06e33", textOnSwatch: "light" },
  { token: "--color-primary-50", name: "Primary soft", hex: "#ecf4f4", textOnSwatch: "dark" },
];

const FINANCE_SWATCHES: Swatch[] = [
  { token: "--color-f-income", name: "Receita · positivo", hex: "#1c8a56", textOnSwatch: "light" },
  { token: "--color-f-expense", name: "Despesa · negativo", hex: "#c03d36", textOnSwatch: "light" },
  { token: "--color-f-debt", name: "Dívida · atenção", hex: "#a8690c", textOnSwatch: "light" },
  { token: "--color-f-goal", name: "Meta · progresso", hex: "#14656d", textOnSwatch: "light" },
  { token: "--color-f-equity", name: "Patrimônio líquido", hex: "#16262b", textOnSwatch: "light" },
  { token: "--color-f-investment", name: "Investimento · crescimento", hex: "#1f6e96", textOnSwatch: "light" },
];

const FINANCE_ROWS = [
  {
    kind: "income" as const,
    label: "Receita",
    rule: "positivo",
    amount: toMinorUnits("18,750.00"),
    sign: "+",
    Icon: IconArrowUpRight,
  },
  {
    kind: "expense" as const,
    label: "Despesa",
    rule: "negativo",
    amount: toMinorUnits("6,320.40"),
    sign: "−",
    Icon: IconArrowDownRight,
  },
  {
    kind: "debt" as const,
    label: "Dívida",
    rule: "atenção",
    amount: toMinorUnits("9,480.00"),
    sign: "",
    Icon: IconAlertTriangle,
  },
  {
    kind: "goal" as const,
    label: "Meta",
    rule: "progresso",
    amount: toMinorUnits("4,200.00"),
    sign: "",
    Icon: IconTarget,
  },
  {
    kind: "equity" as const,
    label: "Patrimônio",
    rule: "patrimônio líquido",
    amount: toMinorUnits("126,900.55"),
    sign: "",
    Icon: IconWallet,
  },
  {
    kind: "investment" as const,
    label: "Investimento",
    rule: "crescimento",
    amount: toMinorUnits("32,100.10"),
    sign: "",
    Icon: IconTrendingUp,
  },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen">
      {/* ── Barra superior ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href="/" aria-label="Volver al inicio">
            <Wordmark />
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
            <a href="#colores" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-soft hover:text-primary-700">
              Colores
            </a>
            <a href="#tipografia" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-soft hover:text-primary-700">
              Tipografía
            </a>
            <a href="#componentes" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-soft hover:text-primary-700">
              Componentes
            </a>
            <a href="#finanzas" className="rounded-full px-3 py-1.5 transition-colors hover:bg-primary-soft hover:text-primary-700">
              Patrones financieros
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        {/* ── Introducción ───────────────────────────────────────────── */}
        <section className="py-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            Etapa 1 · Identidad visual y Design System
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-tight text-primary-950">
            Fintech premium, clara y confiable — sin parecer un banco.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Sistema de diseño propio de Money Path: paleta petrol + cobre sobre superficies
            cálidas, tipografía Space Grotesk (display) y Manrope (UI), componentes accesibles
            y patrones financieros consistentes. Mobile first en cada componente.
          </p>
        </section>

        {/* ── Colores ────────────────────────────────────────────────── */}
        <section id="colores" className="scroll-mt-24 py-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-primary-900 sm:text-2xl">
            Colores
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Tokens semánticos en CSS (<span className="font-mono text-xs">@theme</span> de Tailwind 4)
            — cambiar la marca completa exige editar solo estas variables.
          </p>
          <div className="mt-6 flex flex-col gap-8">
            <SwatchGroup title="Tokens base" swatches={CORE_SWATCHES} />
            <SwatchGroup title="Estados y acento" swatches={STATE_SWATCHES} />
            <SwatchGroup title="Padrões financeiros" swatches={FINANCE_SWATCHES} />
          </div>
        </section>

        {/* ── Tipografía ─────────────────────────────────────────────── */}
        <section id="tipografia" className="scroll-mt-24 py-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-primary-900 sm:text-2xl">
            Tipografía y espacio
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-3 py-6">
                <p className="text-xs font-bold uppercase tracking-wider text-faint">
                  Display — Space Grotesk
                </p>
                <p className="font-display text-3xl font-bold tracking-tight text-text">
                  Tu dinero, con dirección.
                </p>
                <p className="text-xs text-muted">
                  Títulos, cifras y encabezados. Numerales tabulares para montos.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 py-6">
                <p className="text-xs font-bold uppercase tracking-wider text-faint">
                  UI — Manrope
                </p>
                <p className="text-base text-text">
                  Texto de interfaz altamente legible, del detalle de un movimiento a la
                  descripción de una meta.
                </p>
                <p className="text-xs text-muted">
                  Jerarquía: 12px metadatos · 14px cuerpo · 16px+ títulos de tarjeta.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Componentes ────────────────────────────────────────────── */}
        <section id="componentes" className="scroll-mt-24 py-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-primary-900 sm:text-2xl">
            Componentes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Todos los controles son funcionales: prueba modales, drawer (bottom-sheet en móvil),
            toasts, menú desplegable, tooltip y diálogo de confirmación.
          </p>
          <div className="mt-6">
            <Showcase />
          </div>
        </section>

        {/* ── Patrones financieros ───────────────────────────────────── */}
        <section id="finanzas" className="scroll-mt-24 py-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-primary-900 sm:text-2xl">
            Patrones financieros
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Cada tipo de valor tiene color, signo e icono propios, garantizados por el componente{" "}
            <span className="font-mono text-xs">&lt;MoneyValue /&gt;</span> (montos en centavos,
            formato real del núcleo monetario).
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/60">
                  {FINANCE_ROWS.map((row) => (
                    <li
                      key={row.kind}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary-700">
                          <row.Icon size={15} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-text">{row.label}</span>
                          <span className="block text-[11px] text-faint">{row.rule}</span>
                        </span>
                      </span>
                      <MoneyValue amount={row.amount} kind={row.kind} size="lg" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card variant="elevated">
                <CardContent className="py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-faint">
                    Gráficos limpios
                  </p>
                  <p className="mt-1 text-sm font-bold text-text">Patrimonio · últimos 8 meses</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <MoneyValue amount={toMinorUnits("126,900.55")} kind="equity" size="lg" />
                    <Sparkline
                      values={[92, 95, 94, 101, 106, 112, 118, 127]}
                      tone="success"
                      width={140}
                      height={40}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card variant="elevated">
                <CardContent className="py-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-faint">
                    Inversión · CETES
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <MoneyValue amount={toMinorUnits("32,100.10")} kind="investment" size="lg" />
                    <Sparkline
                      values={[24, 25, 25.5, 27, 28.2, 29, 30.6, 32.1]}
                      tone="info"
                      width={140}
                      height={40}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* ── Pie ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <p className="text-xs text-faint">
            Money Path · Design System Etapa 1 · Tokens en{" "}
            <span className="font-mono">src/app/globals.css</span> · Componentes en{" "}
            <span className="font-mono">src/components/ui/</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
