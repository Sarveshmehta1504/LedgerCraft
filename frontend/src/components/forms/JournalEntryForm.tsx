"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { InlineAlert } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney, moneyEquals, today } from "@/lib/format";
import { MOCK_ACCOUNTS, MOCK_CONTACTS, MOCK_JOURNALS } from "@/lib/mock-data";
import type { JournalEntry } from "@/types";

interface EditableLine {
  id: string;
  account_id: number | null;
  contact_id: number | null;
  debit: number;
  credit: number;
}

const accountOptions = MOCK_ACCOUNTS.map((account) => ({
  value: account.id,
  label: `${account.code} · ${account.name}`,
}));

const contactOptions = MOCK_CONTACTS.map((contact) => ({
  value: contact.id,
  label: contact.name,
}));

function blankLine(): EditableLine {
  return {
    id: `line-${Math.random().toString(36).slice(2, 9)}`,
    account_id: null,
    contact_id: null,
    debit: 0,
    credit: 0,
  };
}

export function JournalEntryForm({ entry }: { entry?: JournalEntry }) {
  const router = useRouter();
  const readOnly = entry?.status === "posted";

  const [date, setDate] = useState(entry?.date ?? today());
  const [journalId, setJournalId] = useState<number | null>(entry?.journal_id ?? null);
  const [lines, setLines] = useState<EditableLine[]>(
    entry
      ? entry.lines.map((line) => ({
          id: String(line.id),
          account_id: line.account_id,
          contact_id: line.contact_id,
          debit: line.debit,
          credit: line.credit,
        }))
      : [blankLine(), blankLine()],
  );
  const [attempted, setAttempted] = useState(false);
  const [posting, setPosting] = useState(false);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return { debit, credit, difference: debit - credit };
  }, [lines]);

  const balanced = moneyEquals(totals.debit, totals.credit);
  const hasValue = totals.debit > 0 || totals.credit > 0;
  const allLinesHaveAccount = lines.every((line) => line.account_id !== null);

  /** Post is blocked unless the entry balances — the core double-entry rule. */
  const canPost = balanced && hasValue && allLinesHaveAccount && journalId !== null;

  function updateLine(id: string, patch: Partial<EditableLine>) {
    setLines((previous) =>
      previous.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((previous) => (previous.length <= 1 ? previous : previous.filter((l) => l.id !== id)));
  }

  async function onPost() {
    setAttempted(true);
    if (!canPost) return;
    setPosting(true);
    // TODO: replace with real API once backend/journal-entries is ready
    // (the backend re-validates the balance server-side — this check is UX, not security).
    await new Promise((resolve) => setTimeout(resolve, 450));
    setPosting(false);
    router.push("/journal-entries");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={entry?.reference ?? "New journal entry"}
        subtitle={entry ? "Journal entry" : "Manual double-entry"}
        actions={
          !readOnly && (
            <Button variant="primary" size="sm" onClick={onPost} disabled={posting}>
              {posting ? "Posting…" : "Post"}
            </Button>
          )
        }
        trailing={
          <>
            {entry && <StatusBadge status={entry.status} />}
            {!readOnly && (
              <Button size="sm" onClick={() => router.push("/journal-entries")}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={() => router.push("/journal-entries")}>
              Back
            </Button>
          </>
        }
      />

      <div className="grid max-w-2xl gap-5 p-5 md:grid-cols-2">
        <TextField
          label="Accounting date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={readOnly}
          required
        />
        <SelectField
          label="Journal"
          value={journalId ?? ""}
          onChange={(event) => setJournalId(event.target.value ? Number(event.target.value) : null)}
          options={MOCK_JOURNALS.map((journal) => ({ value: journal.id, label: journal.name }))}
          placeholder="Select a journal"
          error={attempted && journalId === null ? "Select a journal." : undefined}
          disabled={readOnly}
          required
        />
      </div>

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
              <th scope="col" className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-1.5">
                  <select
                    aria-label="Account"
                    value={line.account_id ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateLine(line.id, {
                        account_id: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className={`h-8 w-full cursor-pointer rounded border bg-white px-2 text-[13px] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)] disabled:cursor-default disabled:bg-[var(--surface-raised)] ${
                      attempted && line.account_id === null
                        ? "border-[var(--danger)]"
                        : "border-[var(--line-strong)]"
                    }`}
                  >
                    <option value="">Select account</option>
                    {accountOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-1.5">
                  <select
                    aria-label="Partner"
                    value={line.contact_id ?? ""}
                    disabled={readOnly}
                    onChange={(event) =>
                      updateLine(line.id, {
                        contact_id: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    className="h-8 w-full cursor-pointer rounded border border-[var(--line-strong)] bg-white px-2 text-[13px] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)] disabled:cursor-default disabled:bg-[var(--surface-raised)]"
                  >
                    <option value="">None</option>
                    {contactOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                {(["debit", "credit"] as const).map((side) => (
                  <td key={side} className="px-4 py-1.5">
                    <input
                      aria-label={side === "debit" ? "Debit" : "Credit"}
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={readOnly}
                      value={line[side] || ""}
                      onChange={(event) => {
                        const value = Number(event.target.value) || 0;
                        // A line is one side of the ledger or the other, never both.
                        updateLine(line.id, {
                          [side]: value,
                          [side === "debit" ? "credit" : "debit"]: 0,
                        } as Partial<EditableLine>);
                      }}
                      className="tnum h-8 w-full rounded border border-[var(--line-strong)] bg-white px-2 text-right font-mono text-[13px] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)] disabled:bg-[var(--surface-raised)]"
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right">
                  {!readOnly && lines.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() => removeLine(line.id)}
                      className="cursor-pointer rounded px-1.5 py-1 text-[var(--text-subtle)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--danger)]"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M1 1l10 10M11 1L1 11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
              <td className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Total
              </td>
              <td />
              <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-medium">
                {formatMoney(totals.debit)}
              </td>
              <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-medium">
                {formatMoney(totals.credit)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] p-5">
        {!readOnly && (
          <div>
            <Button size="sm" onClick={() => setLines((previous) => [...previous, blankLine()])}>
              Add line
            </Button>
          </div>
        )}

        {/* Blocking warning from the design board — Post stays disabled while unbalanced. */}
        {!balanced && hasValue && (
          <InlineAlert title="Debit and credit do not match">
            The entry is out by{" "}
            <span className="tnum font-mono font-medium">
              {formatMoney(Math.abs(totals.difference))}
            </span>
            . A journal entry cannot be posted until total debit equals total credit.
          </InlineAlert>
        )}

        {attempted && !hasValue && (
          <InlineAlert title="Nothing to post">
            Enter a debit and a matching credit amount before posting.
          </InlineAlert>
        )}

        {attempted && !allLinesHaveAccount && (
          <InlineAlert title="Every line needs an account">
            Select a chart-of-accounts entry on each line, or remove the empty lines.
          </InlineAlert>
        )}

        {balanced && hasValue && (
          <p className="text-[13px] text-[var(--status-paid)]">
            Balanced — debit equals credit at{" "}
            <span className="tnum font-mono font-medium">{formatMoney(totals.debit)}</span>.
          </p>
        )}
      </div>
    </div>
  );
}
