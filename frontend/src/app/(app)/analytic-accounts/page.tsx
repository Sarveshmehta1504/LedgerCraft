"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { titleCase } from "@/lib/format";
import { MOCK_ANALYTIC_ACCOUNTS, mockRequest } from "@/lib/mock-data";
import type { AnalyticAccount } from "@/types";

export default function AnalyticAccountsPage() {
  const [accounts, setAccounts] = useState<AnalyticAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: replace with real API once backend/analytic-accounts is ready (GET /api/analytic-accounts).
      setAccounts(await mockRequest(MOCK_ANALYTIC_ACCOUNTS));
    } catch {
      setError("The analytic accounts service did not respond.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        onRetry={load}
        emptyTitle="No analytic accounts yet"
        emptyDescription="Create cost centres to track budget against actual spend."
      />
    </div>
  );
}
