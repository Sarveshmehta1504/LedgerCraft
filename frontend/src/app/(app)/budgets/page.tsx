"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ComboboxControl } from "@/components/ui/Combobox";
import { DataTable, type Column } from "@/components/shared/DataTable";
import {
  ClearFilters,
  FilterBar,
  SearchInput,
  SegmentedFilter,
} from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { AnalyticAccountsApi, BudgetsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount, Budget, BudgetStatus } from "@/types";

const STATUS_FILTERS: { value: BudgetStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "revised", label: "Revised" },
  { value: "cancelled", label: "Cancelled" },
];

/** Achieved % is only meaningful once a budget is confirmed. */
function achievedPercent(budget: Budget): number | null {
  if (budget.status === "draft" || budget.committed_amount === 0) return null;
  return (budget.actual_amount / budget.committed_amount) * 100;
}

export default function BudgetsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BudgetStatus | "">("");
  const [analyticId, setAnalyticId] = useState<number | null>(null);

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

  const term = search.trim().toLowerCase();
  const visible = budgets.filter((budget) => {
    const matchesSearch = !term || budget.name.toLowerCase().includes(term);
    const matchesStatus = !status || budget.status === status;
    const matchesAnalytic = analyticId === null || budget.analytic_account_id === analyticId;
    return matchesSearch && matchesStatus && matchesAnalytic;
  });

  const filtered = Boolean(term || status || analyticId !== null);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setAnalyticId(null);
  }

  const columns: Column<Budget>[] = [
    {
      key: "name",
      header: "Budget",
      render: (budget) => <span className="font-medium">{budget.name}</span>,
      sortValue: (budget) => budget.name,
    },
    {
      key: "analytic",
      header: "Analytic account",
      render: (budget) => (
        <span className="text-[var(--text-muted)]">{analyticName(budget.analytic_account_id)}</span>
      ),
      sortValue: (budget) => analyticName(budget.analytic_account_id),
    },
    {
      key: "period",
      header: "Period",
      render: (budget) => (
        <span className="text-[13px] text-[var(--text-muted)]">
          {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
        </span>
      ),
      // Sorted on the start date: a period is ordered by when it opens, and the
      // rendered string would sort on a formatted day-of-month.
      sortValue: (budget) => budget.period_start,
    },
    {
      key: "committed",
      header: "Budget",
      numeric: true,
      render: (budget) => formatMoney(budget.committed_amount),
      sortValue: (budget) => budget.committed_amount,
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
      sortValue: (budget) => (budget.status === "draft" ? null : budget.actual_amount),
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
      // Sorting by this is how you find the over-budget rows: descending puts
      // anything above 100% at the top.
      sortValue: (budget) => achievedPercent(budget),
    },
    {
      key: "status",
      header: "Status",
      render: (budget) => <StatusBadge status={budget.status} />,
      sortValue: (budget) => budget.status,
    },
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

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search budgets"
          label="Search budgets"
        />
        <SegmentedFilter
          value={status}
          options={STATUS_FILTERS}
          onChange={setStatus}
          label="Filter by status"
        />
        <div className="w-56">
          <ComboboxControl
            ariaLabel="Filter by analytic account"
            size="sm"
            value={analyticId}
            onChange={setAnalyticId}
            options={analyticAccounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            placeholder="All analytic accounts"
            clearLabel="All analytic accounts"
          />
        </div>
        {filtered && <ClearFilters onClear={clearFilters} />}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(budget) => budget.id}
        onRowClick={(budget) => router.push(`/budgets/${budget.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={filtered ? "No budgets match" : "No budgets yet"}
        emptyDescription={
          filtered
            ? "Try a different status or analytic account."
            : "Set a committed amount against an analytic account for a period."
        }
      />
    </div>
  );
}
