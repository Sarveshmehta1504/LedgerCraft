"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { AccountsApi, JournalsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ChartOfAccount, Journal, JournalType } from "@/types";

const TYPE_FILTERS: { value: JournalType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
];

export default function JournalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<JournalType | "">("");

  const fetchData = useCallback(() => JournalsApi.list(), []);
  const { data, loading, error, retry } = useAsyncData<Journal[]>(
    fetchData,
    "The journals service did not respond.",
  );
  const journals = data ?? [];

  const fetchAccounts = useCallback(() => AccountsApi.list(), []);
  const { data: accountsData } = useAsyncData<ChartOfAccount[]>(fetchAccounts, "Could not load accounts.");
  const accounts = accountsData ?? [];
  const accountName = (id: number | null) => accounts.find((a) => a.id === id)?.name ?? "—";

  const term = search.trim().toLowerCase();
  const visible = journals.filter((journal) => {
    const matchesSearch = !term || journal.name.toLowerCase().includes(term);
    const matchesType = !typeFilter || journal.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filtered = Boolean(term || typeFilter);

  const columns: Column<Journal>[] = [
    {
      key: "name",
      header: "Journal name",
      render: (journal) => <span className="font-medium">{journal.name}</span>,
      sortValue: (journal) => journal.name,
    },
    {
      key: "type",
      header: "Journal type",
      render: (journal) => titleCase(journal.type),
      sortValue: (journal) => journal.type,
    },
    {
      key: "debit",
      header: "Default debit account",
      render: (journal) => (
        <span className="text-[var(--text-muted)]">{accountName(journal.default_debit_account)}</span>
      ),
      sortValue: (journal) => accountName(journal.default_debit_account),
    },
    {
      key: "credit",
      header: "Default credit account",
      render: (journal) => (
        <span className="text-[var(--text-muted)]">
          {accountName(journal.default_credit_account)}
        </span>
      ),
      sortValue: (journal) => accountName(journal.default_credit_account),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Journals"
        subtitle="Where each kind of entry is recorded"
        actions={
          <Link href="/journals/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search journals"
          label="Search journals"
        />
        <SegmentedFilter
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
          label="Filter by journal type"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(journal) => journal.id}
        onRowClick={(journal) => router.push(`/journals/${journal.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={filtered ? "No journals match" : "No journals configured"}
        emptyDescription={
          filtered
            ? "Try a different search term or journal type."
            : "Sales, purchase, bank and cash journals are normally seeded up front."
        }
      />
    </div>
  );
}
