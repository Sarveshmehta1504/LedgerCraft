"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatMoney, titleCase } from "@/lib/format";
import { MOCK_ANALYTIC_ACCOUNTS, MOCK_BUDGETS, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount } from "@/types";

/** Budgets referencing an analytic account — surfaced on the list and kanban card. */
function budgetSummary(accountId: number) {
  const budgets = MOCK_BUDGETS.filter((budget) => budget.analytic_account_id === accountId);
  return {
    count: budgets.length,
    committed: budgets.reduce((sum, budget) => sum + budget.committed_amount, 0),
  };
}

export default function AnalyticAccountsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");

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
    {
      key: "budgets",
      header: "Budgets",
      numeric: true,
      render: (account) => budgetSummary(account.id).count,
    },
    {
      key: "committed",
      header: "Committed",
      numeric: true,
      render: (account) => formatMoney(budgetSummary(account.id).committed),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Analytic Accounts"
        subtitle="Cost and revenue centres used for budgeting"
        actions={
          <Link href="/analytic-accounts/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
        trailing={<ViewSwitcher value={view} onChange={setView} />}
      />

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={accounts}
          rowKey={(account) => account.id}
          onRowClick={(account) => router.push(`/analytic-accounts/${account.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle="No analytic accounts yet"
          emptyDescription="Create cost centres to track budget against actual spend."
          emptyAction={
            <Link href="/analytic-accounts/new">
              <Button variant="primary" size="sm">
                New analytic account
              </Button>
            </Link>
          }
        />
      ) : loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No analytic accounts yet"
          description="Create cost centres to track budget against actual spend."
        />
      ) : (
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const summary = budgetSummary(account.id);
            return (
              <Link
                key={account.id}
                href={`/analytic-accounts/${account.id}`}
                className="bg-white p-4 transition-colors duration-150 hover:bg-[var(--surface-sunken)]"
              >
                <p className="text-sm font-medium text-[var(--text)]">{account.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                  {titleCase(account.type)}
                </p>
                <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-2.5">
                  <span className="text-xs text-[var(--text-subtle)]">Budgets</span>
                  <span className="tnum font-mono text-[13px]">{summary.count}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs text-[var(--text-subtle)]">Committed</span>
                  <span className="tnum font-mono text-[13px] text-[var(--text-muted)]">
                    {formatMoney(summary.committed)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
