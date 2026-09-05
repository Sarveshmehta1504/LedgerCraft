"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { MOCK_ANALYTIC_ACCOUNTS, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount } from "@/types";

export default function AnalyticAccountsPage() {
  // TODO: replace with real API once backend/analytic-accounts is ready (GET /api/analytic-accounts).
  const fetchData = useCallback(() => mockRequest(MOCK_ANALYTIC_ACCOUNTS), []);
  const { data, loading, error, retry } = useAsyncData<AnalyticAccount[]>(
    fetchData,
    "The analytic accounts service did not respond.",
  );
  const accounts = data ?? [];

  const columns: Column<AnalyticAccount>[] = [
    {
      key: "name",
      header: "Analytic account",
      render: (account) => <span className="font-medium">{account.name}</span>,
    },
    { key: "type", header: "Type", render: (account) => titleCase(account.type) },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Analytic Accounts"
        subtitle="Cost and revenue centres used for budgeting"
        actions={
          <Button variant="primary" size="sm" disabled>
            New
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={accounts}
        rowKey={(account) => account.id}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle="No analytic accounts yet"
        emptyDescription="Create cost centres to track budget against actual spend."
      />
    </div>
  );
}
