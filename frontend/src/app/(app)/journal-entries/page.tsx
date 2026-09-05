"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { JournalEntriesApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { JournalEntry } from "@/types";

export default function JournalEntriesPage() {
  const router = useRouter();
  const fetchData = useCallback(() => JournalEntriesApi.list(), []);
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
    {
      key: "source",
      header: "Source",
      render: (entry) => (
        <span className="text-[var(--text-muted)]">
          {titleCase(entry.source_type.replace(/_/g, " "))}
        </span>
      ),
    },
    {
      key: "journal",
      header: "Journal",
      render: (entry) => (
        <span className="text-[var(--text-muted)]">{entry.journal_name ?? "—"}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (entry) => formatMoney(entry.total_debit),
    },
    {
      // An entry only reaches the ledger balanced; the badge makes that visible
      // rather than assumed, so a bad one would stand out immediately.
      key: "balanced",
      header: "Status",
      render: (entry) => <StatusBadge status={entry.balanced ? "posted" : "draft"} />,
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
