"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { AnalyticAccountsApi, BudgetsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount, Budget } from "@/types";

/** Achieved % is only meaningful once a budget is confirmed. */
function achievedPercent(budget: Budget): number | null {
  if (budget.status === "draft" || budget.committed_amount === 0) return null;
  return (budget.actual_amount / budget.committed_amount) * 100;
}

export default function BudgetsPage() {
  const router = useRouter();
  // Budget rows carry analytic_account_id only, so the names come from the
  // analytic accounts list rather than a per-row lookup.
  const fetchData = useCallback(
    () => Promise.all([BudgetsApi.list(), AnalyticAccountsApi.list()]),
    [],
  );
  const { data, loading, error, retry } = useAsyncData<[Budget[], AnalyticAccount[]]>(
    fetchData,
    "The budgets service did not respond.",
  );
  const budgets = data?.[0] ?? [];
  const analyticAccounts = data?.[1] ?? [];

  const analyticName = (id: number | null): string =>
    analyticAccounts.find((account) => account.id === id)?.name ?? "—";

  const columns: Column<Budget>[] = [
    {
      key: "name",
      header: "Budget",
      render: (budget) => <span className="font-medium">{budget.name}</span>,
    },
    {
      key: "analytic",
      header: "Analytic account",
      render: (budget) => (
        <span className="text-[var(--text-muted)]">{analyticName(budget.analytic_account_id)}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (budget) => (
        <span className="text-[13px] text-[var(--text-muted)]">
          {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
        </span>
      ),
    },
    {
      key: "committed",
      header: "Budget",
      numeric: true,
      render: (budget) => formatMoney(budget.committed_amount),
    },
    {
      key: "actual",
      header: "Achieved",
      numeric: true,
      render: (budget) =>
        budget.status === "draft" ? (
          <span className="text-[var(--text-subtle)]">—</span>
        ) : (
          formatMoney(budget.actual_amount)
        ),
    },
    {
      key: "percent",
      header: "%",
      numeric: true,
      render: (budget) => {
        const percent = achievedPercent(budget);
        if (percent === null) return <span className="text-[var(--text-subtle)]">—</span>;
        const over = percent > 100;
        return (
          <span className={over ? "text-[var(--status-paid)]" : "text-[var(--text)]"}>
            {percent.toFixed(1)}%
          </span>
        );
      },
    },
    { key: "status", header: "Status", render: (budget) => <StatusBadge status={budget.status} /> },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title="Analytic Budgets"
        subtitle="Planned versus achieved, computed from the ledger"
        actions={
          <Link href="/budgets/new">
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
        trailing={
          <Link href="/reports/budget">
            <Button size="sm">Report</Button>
          </Link>
        }
      />
      <DataTable
        columns={columns}
        rows={budgets}
        rowKey={(budget) => budget.id}
        onRowClick={(budget) => router.push(`/budgets/${budget.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle="No budgets yet"
        emptyDescription="Set a committed amount against an analytic account for a period."
      />
    </div>
  );
}
