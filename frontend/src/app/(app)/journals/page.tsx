"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { AccountsApi, JournalsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ChartOfAccount, Journal } from "@/types";

export default function JournalsPage() {
  const router = useRouter();
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

  const columns: Column<Journal>[] = [
    {
      key: "name",
      header: "Journal name",
      render: (journal) => <span className="font-medium">{journal.name}</span>,
    },
    { key: "type", header: "Journal type", render: (journal) => titleCase(journal.type) },
    {
      key: "debit",
      header: "Default debit account",
      render: (journal) => (
        <span className="text-[var(--text-muted)]">{accountName(journal.default_debit_account)}</span>
      ),
    },
    {
      key: "credit",
      header: "Default credit account",
      render: (journal) => (
        <span className="text-[var(--text-muted)]">
          {accountName(journal.default_credit_account)}
        </span>
      ),
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
      <DataTable
        columns={columns}
        rows={journals}
        rowKey={(journal) => journal.id}
        onRowClick={(journal) => router.push(`/journals/${journal.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle="No journals configured"
        emptyDescription="Sales, purchase, bank and cash journals are normally seeded up front."
      />
    </div>
  );
}
