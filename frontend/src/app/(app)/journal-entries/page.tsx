"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import {
  ClearFilters,
  DateRangeFilter,
  FilterBar,
  SearchInput,
  SegmentedFilter,
} from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { ComboboxControl } from "@/components/ui/Combobox";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { JournalEntriesApi, JournalsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Journal, JournalEntry, JournalEntrySource } from "@/types";

/**
 * Short labels on purpose: the underlying values are `vendor_bill` and
 * `customer_invoice`, which title-case into something too wide to sit in a row
 * of toggles.
 */
const SOURCE_FILTERS: { value: JournalEntrySource | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "customer_invoice", label: "Invoices" },
  { value: "vendor_bill", label: "Bills" },
  { value: "payment", label: "Payments" },
  { value: "opening_balance", label: "Opening" },
];

export default function JournalEntriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<JournalEntrySource | "">("");
  const [journalId, setJournalId] = useState<number | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchData = useCallback(() => JournalEntriesApi.list(), []);
  const { data, loading, error, retry } = useAsyncData<JournalEntry[]>(
    fetchData,
    "The ledger service did not respond.",
  );
  const entries = data ?? [];

  const fetchJournals = useCallback(() => JournalsApi.list(), []);
  const { data: journalsData } = useAsyncData<Journal[]>(fetchJournals, "Could not load journals.");
  const journals = journalsData ?? [];

  const term = search.trim().toLowerCase();
  const visible = entries.filter((entry) => {
    // The reference is the source document's own number, so searching it is how
    // you find the ledger entry behind INV/2026/0007.
    const matchesSearch =
      !term ||
      (entry.reference ?? "").toLowerCase().includes(term) ||
      (entry.partner?.name ?? "").toLowerCase().includes(term);
    const matchesSource = !source || entry.source_type === source;
    const matchesJournal = journalId === null || entry.journal_id === journalId;
    // Dates are ISO strings from the API, so a lexical comparison is a date
    // comparison and needs no parsing.
    const matchesFrom = !from || entry.date >= from;
    const matchesTo = !to || entry.date <= to;
    return matchesSearch && matchesSource && matchesJournal && matchesFrom && matchesTo;
  });

  const filtered = Boolean(term || source || journalId !== null || from || to);

  function clearFilters() {
    setSearch("");
    setSource("");
    setJournalId(null);
    setFrom("");
    setTo("");
  }

  const columns: Column<JournalEntry>[] = [
    {
      key: "date",
      header: "Date",
      render: (entry) => formatDate(entry.date),
      sortValue: (entry) => entry.date,
    },
    {
      key: "number",
      header: "Number",
      render: (entry) => (
        <span className="tnum font-mono text-[13px] font-medium">{entry.reference ?? "—"}</span>
      ),
      sortValue: (entry) => entry.reference,
    },
    {
      key: "source",
      header: "Source",
      render: (entry) => (
        <span className="text-[var(--text-muted)]">
          {titleCase(entry.source_type.replace(/_/g, " "))}
        </span>
      ),
      sortValue: (entry) => entry.source_type,
    },
    {
      key: "journal",
      header: "Journal",
      render: (entry) => (
        <span className="text-[var(--text-muted)]">{entry.journal_name ?? "—"}</span>
      ),
      sortValue: (entry) => entry.journal_name,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (entry) => formatMoney(entry.total_debit),
      sortValue: (entry) => entry.total_debit,
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
      {/* No New action: the ledger has no create route. Entries are written by
          the system when a bill, invoice or payment is posted. */}
      <PageHeader
        title="Journal Entries"
        subtitle="The ledger — every posted debit and credit"
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference or partner"
          label="Search journal entries"
        />
        <SegmentedFilter
          value={source}
          options={SOURCE_FILTERS}
          onChange={setSource}
          label="Filter by source document"
        />
        <div className="w-44">
          <ComboboxControl
            ariaLabel="Filter by journal"
            size="sm"
            value={journalId}
            onChange={setJournalId}
            options={journals.map((journal) => ({ value: journal.id, label: journal.name }))}
            placeholder="All journals"
            clearLabel="All journals"
          />
        </div>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          label="Entry date"
        />
        {filtered && <ClearFilters onClear={clearFilters} />}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(entry) => entry.id}
        onRowClick={(entry) => router.push(`/journal-entries/${entry.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={filtered ? "No entries match" : "No journal entries yet"}
        emptyDescription={
          filtered
            ? "Widen the date range or clear the source filter to see more."
            : "Posting a bill or an invoice writes its entry here automatically."
        }
      />
    </div>
  );
}
