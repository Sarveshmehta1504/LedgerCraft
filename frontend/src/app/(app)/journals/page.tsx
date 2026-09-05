"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { MOCK_JOURNALS, accountName, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { Journal } from "@/types";

export default function JournalsPage() {
  const router = useRouter();
  // TODO: replace with real API once backend/journals is ready (GET /api/journals).
  const fetchData = useCallback(() => mockRequest(MOCK_JOURNALS), []);
  const { data, loading, error, retry } = useAsyncData<Journal[]>(
    fetchData,
    "The journals service did not respond.",
  );
  const journals = data ?? [];

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
