"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { MOCK_JOURNAL_ENTRIES, contactName, journalName, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { JournalEntry } from "@/types";

/** The partner on an entry is whichever contact its lines reference. */
function entryPartner(entry: JournalEntry): string {
  const line = entry.lines.find((item) => item.contact_id !== null);
  return line ? contactName(line.contact_id) : "—";
}

export default function JournalEntriesPage() {
  const router = useRouter();
  // TODO: replace with real API once backend/journal-entries is ready (GET /api/journal-entries).
  const fetchData = useCallback(() => mockRequest(MOCK_JOURNAL_ENTRIES), []);
  const { data, loading, error, retry } = useAsyncData<JournalEntry[]>(
    fetchData,
    "The ledger service did not respond.",
  );
  const entries = data ?? [];

  const columns: Column<JournalEntry>[] = [
    { key: "date", header: "Date", render: (entry) => formatDate(entry.date) },
    {
      key: "number",
      header: "Number",
      render: (entry) => (
        <span className="tnum font-mono text-[13px] font-medium">{entry.reference ?? "—"}</span>
      ),
    },
    { key: "partner", header: "Partner", render: (entry) => entryPartner(entry) },
    {
      key: "journal",
      header: "Journal",
      render: (entry) => (
        <span className="text-[var(--text-muted)]">{journalName(entry.journal_id)}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (entry) => formatMoney(entry.total),
    },
    {
      key: "status",
      header: "Status",
      render: (entry) => <StatusBadge status={entry.status} />,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Journal Entries"
        subtitle="The ledger — every posted debit and credit"
        actions={
          <Link href="/journal-entries/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        onRowClick={(entry) => router.push(`/journal-entries/${entry.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle="No journal entries yet"
        emptyDescription="Posting a bill or an invoice writes its entry here automatically."
      />
    </div>
  );
}
