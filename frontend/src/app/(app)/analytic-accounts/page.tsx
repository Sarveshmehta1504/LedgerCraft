"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { formatMoney, titleCase } from "@/lib/format";
import { AnalyticAccountsApi, BudgetsApi } from "@/lib/resources";
import { getCurrentUser } from "@/lib/session";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount, Budget } from "@/types";

export default function AnalyticAccountsPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Archiving is admin-only on the backend; showing the control to an
  // accountant would just render a 403.
  const isAdmin = typeof window !== "undefined" && getCurrentUser()?.role === "admin";

  // The accounts endpoint carries a budgets_count but not the committed total,
  // so the budgets list is fetched alongside it and both figures come from there.
  const fetchData = useCallback(
    () => Promise.all([AnalyticAccountsApi.list(showArchived ? "only" : undefined), BudgetsApi.list()]),
    [showArchived],
  );
  const { data, loading, error, retry } = useAsyncData<[AnalyticAccount[], Budget[]]>(
    fetchData,
    "The analytic accounts service did not respond.",
  );
  const accounts = data?.[0] ?? [];
  const budgets = data?.[1] ?? [];

  /**
   * Budgets referencing an analytic account — surfaced on the list and kanban card.
   *
   * Committed counts only live budgets: a `revised` one has been superseded by
   * its replacement and a `cancelled` one never ran, so including either would
   * add the same money to the account twice.
   */
  function budgetSummary(accountId: number) {
    const matching = budgets.filter((budget) => budget.analytic_account_id === accountId);
    const live = matching.filter(
      (budget) => budget.status === "draft" || budget.status === "confirmed",
    );
    return {
      count: matching.length,
      committed: live.reduce((sum, budget) => sum + budget.committed_amount, 0),
    };
  }

  async function toggleArchived(account: AnalyticAccount) {
    setActionError(null);
    setBusyId(account.id);
    try {
      if (account.archived_at) await AnalyticAccountsApi.unarchive(account.id);
      else await AnalyticAccountsApi.archive(account.id);
      retry();
    } catch (err) {
      // The backend refuses to archive an account a live budget still needs.
      setActionError(
        err instanceof ApiError ? err.message : "Could not change this account's status.",
      );
    } finally {
      setBusyId(null);
    }
  }

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
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "",
            render: (account: AnalyticAccount) => (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant={account.archived_at ? "secondary" : "danger"}
                  disabled={busyId === account.id}
                  onClick={(event) => {
                    // The row itself navigates to the account.
                    event.stopPropagation();
                    void toggleArchived(account);
                  }}
                >
                  {busyId === account.id
                    ? "Working…"
                    : account.archived_at
                      ? "Restore"
                      : "Archive"}
                </Button>
              </div>
            ),
          } satisfies Column<AnalyticAccount>,
        ]
      : []),
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
        trailing={
          <>
            <Button
              size="sm"
              onClick={() => setShowArchived((value) => !value)}
              aria-pressed={showArchived}
              className={showArchived ? "bg-[var(--surface-raised)]" : undefined}
            >
              {showArchived ? "Showing archived" : "Show archived"}
            </Button>
            <ViewSwitcher value={view} onChange={setView} />
          </>
        }
      />

      {actionError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={actionError} />
        </div>
      )}

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={accounts}
          rowKey={(account) => account.id}
          onRowClick={(account) => router.push(`/analytic-accounts/${account.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={showArchived ? "No archived accounts" : "No analytic accounts yet"}
          emptyDescription={
            showArchived
              ? "Every cost centre is currently active."
              : "Create cost centres to track budget against actual spend."
          }
          emptyAction={
            showArchived ? undefined : (
            <Link href="/analytic-accounts/new">
              <Button variant="primary" size="sm">
                New analytic account
              </Button>
            </Link>
            )
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
