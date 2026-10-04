/**
 * Reports & Insights (Etapa 18) — gráficos SVG, renderizados no servidor.
 */

import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/config/locales";
import type { CategoryReport, MonthPoint } from "@/lib/reports";

/* ── Barras agrupadas ingresos/gastos por mes ────────────────────────── */

export function IncomeExpensesBars({
  months,
  currency,
}: {
  months: MonthPoint[];
  currency: CurrencyCode;
}) {
  const width = 560;
  const height = 190;
  const top = 14;
  const bottom = 26;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...months.map((m) => Math.max(m.incomeMinor, m.expensesMinor)));
  const groupWidth = width / Math.max(1, months.length);
  const barWidth = Math.min(22, groupWidth / 3);
  const gap = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <line
          key={fraction}
          x1={0}
          x2={width}
          y1={top + chartHeight - chartHeight * fraction}
          y2={top + chartHeight - chartHeight * fraction}
          stroke="var(--color-line)"
          strokeWidth={fraction === 1 ? 1.2 : 0.8}
          strokeDasharray={fraction === 1 ? undefined : "3 4"}
        />
      ))}
      {months.map((m, index) => {
        const centerX = groupWidth * index + groupWidth / 2;
        const incomeHeight = Math.max(m.incomeMinor > 0 ? 3 : 0, (m.incomeMinor / maxValue) * chartHeight);
        const expenseHeight = Math.max(m.expensesMinor > 0 ? 3 : 0, (m.expensesMinor / maxValue) * chartHeight);
        return (
          <g key={m.key}>
            <rect
              x={centerX - barWidth - gap / 2}
              y={top + chartHeight - incomeHeight}
              width={barWidth}
              height={incomeHeight}
              rx="3"
              fill="var(--color-f-income)"
            >
              <title>{`${m.label} · ${formatMoney(m.incomeMinor, { currency })}`}</title>
            </rect>
            <rect
              x={centerX + gap / 2}
              y={top + chartHeight - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              rx="3"
              fill="var(--color-f-expense)"
            >
              <title>{`${m.label} · ${formatMoney(m.expensesMinor, { currency })}`}</title>
            </rect>
            <text x={centerX} y={height - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-faint)">
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Línea de evolución del patrimonio ───────────────────────────────── */

export function NetWorthLine({
  points,
  currency,
}: {
  points: MonthPoint[];
  currency: CurrencyCode;
}) {
  const width = 560;
  const height = 170;
  const padX = 12;
  const padY = 20;
  const values = points.map((p) => p.savingsMinor);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const coords = points.map((p, index) => ({
    x: padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2),
    y: padY + (1 - (p.savingsMinor - min) / range) * (height - padY * 2),
  }));
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `M ${coords[0].x} ${height - 4} L ${line.split(" ").join(" L ")} L ${coords[coords.length - 1].x} ${height - 4} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      <defs>
        <linearGradient id="report-nw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#report-nw)" />
      <polyline points={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, index) => (
        <circle key={index} cx={c.x} cy={c.y} r="3" fill="var(--color-primary)">
          <title>{`${points[index].label} · ${formatMoney(points[index].savingsMinor, { currency })}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ── Barras horizontales por categoría (con variación) ───────────────── */

export function CategoryBars({
  categories,
  currency,
  labels,
}: {
  categories: CategoryReport[];
  currency: CurrencyCode;
  labels: { current: string; vsPrev: string };
}) {
  const maxValue = Math.max(1, ...categories.map((c) => c.currentMinor));
  return (
    <div className="flex flex-col gap-3">
      {categories.slice(0, 8).map((category) => {
        const widthPct = Math.max(2, Math.round((category.currentMinor / maxValue) * 100));
        const change = category.changePct;
        return (
          <div key={category.name}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-text">{category.name}</span>
              <span className="flex items-center gap-2">
                {change !== null ? (
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      change > 0 ? "text-danger-strong" : change < 0 ? "text-success-strong" : "text-faint"
                    }`}
                    title={labels.vsPrev}
                  >
                    {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {Math.abs(change).toFixed(0)}%
                  </span>
                ) : null}
                <span className="text-xs font-semibold tabular-nums text-text">
                  {formatMoney(category.currentMinor, { currency })}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary-50">
              <div className="h-full rounded-full bg-primary" style={{ width: `${widthPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
