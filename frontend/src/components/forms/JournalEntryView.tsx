"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ReadOnlyField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import type { JournalEntry } from "@/types";

/**
 * One posted ledger entry, read-only throughout.
 *
 * The ledger has no create or update route by design: entries are written by
 * the system when a bill, invoice or payment is posted. So this screen renders
 * values, never inputs — a disabled `<select>` still reads as "you may change
 * this", which is the wrong promise for the audit trail.
 */
export function JournalEntryView({ entry }: { entry: JournalEntry }) {
  const router = useRouter();

  // Partner belongs to the entry, not the line: it is derived from the source
  // document. It repeats down the column so the table matches the design board,
  // and an opening-balance entry legitimately has none.
  const partner = entry.partner?.name ?? "—";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={entry.reference ?? "Journal entry"}
        subtitle="Journal entry"
        trailing={
          <>
            <StatusBadge status={entry.balanced ? "posted" : "draft"} />
            <Button size="sm" onClick={() => router.push("/journal-entries")}>
              Back
            </Button>
          </>
        }
      />

      <dl className="grid gap-x-8 gap-y-4 p-5 sm:grid-cols-3">
        <ReadOnlyField label="Accounting date" value={formatDate(entry.date)} />
        <ReadOnlyField label="Journal" value={entry.journal_name ?? "—"} />
        <ReadOnlyField label="Partner" value={partner} />
      </dl>

      <div className="overflow-x-auto border-t border-[var(--line)]">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
              {["Account", "Partner", "Debit", "Credit"].map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                    index >= 2 ? "text-right" : "text-left"
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {entry.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-2.5 text-[var(--text)]">{line.account_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{partner}</td>
                {/* A ledger line is one side or the other, so the unused side is
                    left blank rather than printed as a zero that looks posted. */}
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                  {line.debit > 0 ? formatMoney(line.debit) : ""}
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                  {line.credit > 0 ? formatMoney(line.credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
              <td
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                colSpan={2}
              >
                Total
              </td>
              <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-medium">
                {formatMoney(entry.total_debit)}
              </td>
              <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-medium">
                {formatMoney(entry.total_credit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border-t border-[var(--line)] p-5">
        {entry.balanced ? (
          <p className="text-[13px] text-[var(--status-paid)]">
            Balanced — debit equals credit at{" "}
            <span className="tnum font-mono font-medium">{formatMoney(entry.total_debit)}</span>.
          </p>
        ) : (
          <p className="text-[13px] text-[var(--danger)]">
            Out of balance by{" "}
            <span className="tnum font-mono font-medium">
              {formatMoney(Math.abs(entry.total_debit - entry.total_credit))}
            </span>
            . Report this — a posted entry should never be unbalanced.
          </p>
        )}
      </div>
    </div>
  );
}
