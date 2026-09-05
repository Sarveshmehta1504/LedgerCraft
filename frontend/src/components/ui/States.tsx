import type { ReactNode } from "react";
import { Button } from "./Button";

/** Skeleton rows sized to the real table, not a spinner on a blank screen. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-[var(--line)]" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-2.5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 animate-pulse rounded bg-[var(--surface-raised)]"
              style={{
                width: colIndex === 0 ? "18%" : colIndex === columns - 1 ? "10%" : "14%",
                animationDelay: `${(rowIndex * columns + colIndex) * 25}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <div className="mb-1 h-8 w-8 rounded-full border border-dashed border-[var(--line-strong)]" />
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="max-w-sm text-[13px] text-[var(--text-muted)]">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-[var(--danger)]">Could not load this data</p>
      <p className="max-w-sm text-[13px] text-[var(--text-muted)]">{message}</p>
      {onRetry && (
        <div className="mt-2">
          <Button onClick={onRetry}>Retry</Button>
        </div>
      )}
    </div>
  );
}

/**
 * Business-rule violations (unbalanced entry, overpayment) are shown inline and
 * persistently — docs/FRONTEND_REQUIREMENTS.md calls out that a dismissible toast
 * is the wrong surface for these.
 */
export function InlineAlert({
  tone = "danger",
  title,
  children,
}: {
  tone?: "danger" | "info";
  title: string;
  children?: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-[var(--danger-wash)] text-[var(--danger)]"
      : "border-[var(--line)] bg-[var(--surface-raised)] text-[var(--text-muted)]";
  return (
    <div role="alert" className={`rounded-md border px-3 py-2 text-[13px] ${toneClass}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-0.5 opacity-90">{children}</div>}
    </div>
  );
}
