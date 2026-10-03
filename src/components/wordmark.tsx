/**
 * Wordmark de Money Path: un sendero ascendente con tres hitos,
 * dibujado en SVG inline (sin assets externos).
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        role="img"
        aria-label="Money Path"
        className="shrink-0"
      >
        <rect x="1" y="1" width="32" height="32" rx="9" fill="var(--color-primary-700)" />
        <path
          d="M8 24.5C12.5 24.5 13 18.5 17 18.5C21 18.5 21.5 12.5 26 12.5"
          stroke="var(--color-accent-400)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="8" cy="24.5" r="2.3" fill="var(--color-primary-200)" />
        <circle cx="17" cy="18.5" r="2.3" fill="var(--color-primary-100)" />
        <circle cx="26" cy="12.5" r="2.6" fill="#f6efe4" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-primary-900">
        Money&nbsp;Path
      </span>
    </span>
  );
}
