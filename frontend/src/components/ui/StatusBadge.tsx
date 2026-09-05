import { titleCase } from "@/lib/format";

/** Colour convention fixed by docs/UI_GUIDELINES.md. */
const styles: Record<string, string> = {
  draft: "bg-[var(--status-draft-wash)] text-[var(--status-draft)] ring-zinc-200",
  confirmed: "bg-[var(--status-confirmed-wash)] text-[var(--status-confirmed)] ring-blue-200",
  posted: "bg-[var(--status-posted-wash)] text-[var(--status-posted)] ring-blue-200",
  paid: "bg-[var(--status-paid-wash)] text-[var(--status-paid)] ring-emerald-200",
  billed: "bg-[var(--status-billed-wash)] text-[var(--status-billed)] ring-indigo-200",
  invoiced: "bg-[var(--status-billed-wash)] text-[var(--status-billed)] ring-indigo-200",
  overdue: "bg-[var(--status-overdue-wash)] text-[var(--status-overdue)] ring-red-200",
  cancelled: "bg-[var(--status-draft-wash)] text-[var(--status-draft)] ring-zinc-200",
  revised: "bg-[var(--status-draft-wash)] text-[var(--status-draft)] ring-zinc-200",
};

/**
 * Always renders the status word, never colour alone — colour is reinforcement,
 * not the message (accessibility: do not rely on colour to convey meaning).
 */
export function StatusBadge({ status }: { status: string }) {
  const tone = styles[status] ?? styles.draft;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${tone}`}
    >
      {titleCase(status)}
    </span>
  );
}
