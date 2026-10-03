/**
 * Gráficos limpos do dashboard (Etapa 6).
 * SVG puro, renderizados no servidor, sem dependências externas.
 * Todos os valores chegan en centavos (MinorUnits).
 */

import type { MonthPoint, ExpenseSlice, GoalView } from "@/lib/dashboard";

const INCOME_COLOR = "#2a7982"; // primary-500
const EXPENSE_COLOR = "#c03d36"; // danger
const PATH_COLOR = "#14656d"; // primary-600

function toDecimal(minor: number): number {
  return minor / 100;
}

function compact(minor: number): string {
  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toDecimal(minor));
}

/* ── Ingresos vs gastos (barras agrupadas) ─────────────────────────── */

export function IncomeVsExpensesChart({ series }: { series: MonthPoint[] }) {
  const width = 560;
  const height = 190;
  const top = 14;
  const bottom = 26;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...series.map((point) => Math.max(point.income, point.expenses)));

  const groupWidth = width / series.length;
  const barWidth = Math.min(22, groupWidth / 3);
  const gap = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Ingresos vs gastos, últimos 6 meses"
    >
      {[0.25, 0.5, 0.75, 1].map((fraction) => (
        <line
          key={fraction}
          x1={0}
          x2={width}
          y1={top + chartHeight - chartHeight * fraction}
          y2={top + chartHeight - chartHeight * fraction}
          stroke="#e4e1d5"
          strokeWidth={fraction === 1 ? 1.2 : 0.8}
          strokeDasharray={fraction === 1 ? undefined : "3 4"}
        />
      ))}
      {series.map((point, index) => {
        const centerX = groupWidth * index + groupWidth / 2;
        const incomeHeight = Math.max(point.income > 0 ? 3 : 0, (point.income / maxValue) * chartHeight);
        const expenseHeight = Math.max(point.expenses > 0 ? 3 : 0, (point.expenses / maxValue) * chartHeight);
        return (
          <g key={point.key}>
            <rect
              x={centerX - barWidth - gap / 2}
              y={top + chartHeight - incomeHeight}
              width={barWidth}
              height={incomeHeight}
              rx="3"
              fill={INCOME_COLOR}
            >
              <title>{`Ingresos ${point.label}: ${compact(point.income)}`}</title>
            </rect>
            <rect
              x={centerX + gap / 2}
              y={top + chartHeight - expenseHeight}
              width={barWidth}
              height={expenseHeight}
              rx="3"
              fill={EXPENSE_COLOR}
            >
              <title>{`Gastos ${point.label}: ${compact(point.expenses)}`}</title>
            </rect>
            <text
              x={centerX}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="#7f8c90"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Distribución de gastos (dona) ─────────────────────────────────── */

const DONUT_COLORS = ["#14656d", "#c06e33", "#1f6e96", "#1c8a56", "#a8690c", "#4b969f"];

export function ExpenseDonut({ slices }: { slices: ExpenseSlice[] }) {
  const total = slices.reduce((acc, slice) => acc + slice.amount, 0);
  const maxSlices = 5;
  const top = slices.slice(0, maxSlices);
  const rest = slices.slice(maxSlices).reduce((acc, slice) => acc + slice.amount, 0);
  const segments = rest > 0 ? [...top, { name: "Otros", amount: rest }] : top;

  const size = 168;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="Distribución de gastos del mes"
        className="shrink-0 -rotate-90"
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ecf4f4" strokeWidth="24" />
        {segments.map((segment, index) => {
          const fraction = total > 0 ? segment.amount / total : 0;
          const dash = fraction * circumference;
          const element = (
            <circle
              key={`${segment.name}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth="24"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            >
              <title>{`${segment.name}: ${compact(segment.amount)}`}</title>
            </circle>
          );
          offset += dash;
          return element;
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="16"
          fontWeight="700"
          fill="#16262b"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
        >
          {compact(total)}
        </text>
      </svg>

      <ul className="flex w-full max-w-56 flex-col gap-2">
        {segments.map((segment, index) => {
          const percent = total > 0 ? Math.round((segment.amount / total) * 100) : 0;
          return (
            <li key={`${segment.name}-${index}`} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate font-semibold text-text">
                {segment.name}
              </span>
              <span className="font-display font-semibold tabular-nums text-muted">
                {percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Evolución del patrimonio (línea + área) ───────────────────────── */

export function NetWorthArea({ points }: { points: Array<{ date: string; amount: number }> }) {
  const width = 560;
  const height = 170;
  const padX = 10;
  const padY = 18;

  if (points.length === 1) {
    const single = points[0];
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Punto de partida del patrimonio">
        <line
          x1={padX}
          x2={width - padX}
          y1={height / 2}
          y2={height / 2}
          stroke="#cec9ba"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <circle cx={width / 2} cy={height / 2} r="6" fill={PATH_COLOR} />
        <circle cx={width / 2} cy={height / 2} r="11" fill={PATH_COLOR} opacity="0.15" />
        <text
          x={width / 2}
          y={height / 2 - 18}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#16262b"
        >
          {compact(single.amount)}
        </text>
      </svg>
    );
  }

  const values = points.map((point) => point.amount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = padX + (index / (points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (point.amount - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const linePath = coordinates.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const areaPath = `M ${coordinates[0].x} ${height} L ${linePath.split(" ").join(" L ")} L ${
    coordinates[coordinates.length - 1].x
  } ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Evolución del patrimonio">
      <defs>
        <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PATH_COLOR} stopOpacity="0.22" />
          <stop offset="100%" stopColor={PATH_COLOR} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#nw-fill)" />
      <polyline
        points={linePath}
        fill="none"
        stroke={PATH_COLOR}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coordinates.map((coord, index) => (
        <circle key={`${coord.x}-${index}`} cx={coord.x} cy={coord.y} r="3.4" fill={PATH_COLOR}>
          <title>{`${points[index].date}: ${compact(points[index].amount)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* ── Progreso de metas ─────────────────────────────────────────────── */

export function GoalsProgress({ goals }: { goals: GoalView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {goals.map((goal, index) => {
        const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
        return (
          <li key={`${goal.name}-${index}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-text">{goal.name}</span>
              <span className="font-display text-xs font-semibold tabular-nums text-muted">
                {percent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={goal.name}
              className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-primary-50 ring-1 ring-inset ring-border/60"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] tabular-nums text-faint">
              {compact(goal.current)} / {compact(goal.target)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
