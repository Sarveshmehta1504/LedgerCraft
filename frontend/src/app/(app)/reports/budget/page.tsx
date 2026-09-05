"use client";

import { useCallback } from "react";
import { ReportShell } from "@/components/shared/ReportShell";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatMoney } from "@/lib/format";
import { mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import { buildBudgetReport } from "@/lib/reports";
import type { BudgetReportRow } from "@/types";

/**
 * Planned versus achieved per budget. Paired bars rather than a pie — the question
 * this answers is "did we come in over or under", which is a comparison, not a share.
 */
function BudgetChart({ rows }: { rows: BudgetReportRow[] }) {
  const max = Math.max(...rows.flatMap((row) => [row.planned_amount, row.actual_amount]), 1);

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--line-strong)]" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--accent)]" /> Achieved
        </span>
      </div>

      {rows.map((row) => {
        const plannedWidth = (row.planned_amount / max) * 100;
        const actualWidth = (row.actual_amount / max) * 100;
        const over = row.actual_amount > row.planned_amount;
        return (
          <div key={row.budget_id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-[var(--text)]">{row.name}</span>
              <span className="tnum font-mono text-[12px] text-[var(--text-muted)]">
                {formatMoney(row.actual_amount)} of {formatMoney(row.planned_amount)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-2 rounded-sm bg-[var(--surface-raised)]">
                <div
                  className="h-full rounded-sm bg-[var(--line-strong)]"
                  style={{ width: `${plannedWidth}%` }}
                />
              </div>
              <div className="h-2 rounded-sm bg-[var(--surface-raised)]">
                <div
                  className={`h-full rounded-sm ${over ? "bg-[var(--status-paid)]" : "bg-[var(--accent)]"}`}
                  style={{ width: `${actualWidth}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BudgetReportPage() {
  // TODO: replace with real API once backend/reports is ready (GET /api/reports/budget?budget_id=…).
  const fetchData = useCallback(() => mockRequest(buildBudgetReport()), []);
  const { data, loading, error, retry } = useAsyncData<BudgetReportRow[]>(
    fetchData,
    "The reporting service did not respond.",
  );
  const rows = data ?? [];

  return (
    <ReportShell title="Budget Report" subtitle="Planned versus achieved by analytic account">
      {loading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No confirmed budgets"
          description="A budget only reports achievement once it has been confirmed."
        />
      ) : (
        <>
          <BudgetChart rows={rows} />
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
                  {["Budget", "Analytic account", "Planned", "Achieved", "Variance"].map(
                    (header, index) => (
                      <th
                        key={header}
                        scope="col"
                        className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                          index >= 2 ? "text-right" : "text-left"
                        }`}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((row) => (
                  <tr key={row.budget_id}>
                    <td className="px-4 py-2.5 font-medium">{row.name}</td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{row.analytic_account}</td>
                    <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                      {formatMoney(row.planned_amount)}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                      {formatMoney(row.actual_amount)}
                    </td>
                    <td
                      className={`tnum px-4 py-2.5 text-right font-mono text-[13px] font-medium ${
                        row.variance >= 0 ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {row.variance >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(row.variance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ReportShell>
  );
}
