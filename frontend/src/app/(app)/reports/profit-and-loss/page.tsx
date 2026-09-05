"use client";

import { useCallback, useState } from "react";
import { ReportSection, ReportShell } from "@/components/shared/ReportShell";
import { ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { formatMoney } from "@/lib/format";
import { ReportsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ProfitAndLoss } from "@/types";

export default function ProfitAndLossPage() {
  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-09-05");

  const invalidRange = Boolean(from && to && to < from);

  const fetchData = useCallback(() => ReportsApi.profitAndLoss(from, to), [from, to]);
  const { data: report, loading, error, retry } = useAsyncData<ProfitAndLoss>(
    fetchData,
    "The reporting service did not respond.",
  );

  const profitable = (report?.net_income ?? 0) >= 0;

  return (
    <ReportShell
      report="profit-and-loss"
      params={{ from, to }}
      title="Profit and Loss"
      subtitle="Income against expenses for the period"
      controls={
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-8 rounded-md border border-[var(--line-strong)] px-2.5 text-sm focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[var(--text-muted)]">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-invalid={invalidRange}
              className={`h-8 rounded-md border px-2.5 text-sm focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)] ${
                invalidRange ? "border-[var(--danger)]" : "border-[var(--line-strong)]"
              }`}
            />
          </label>
        </>
      }
    >
      {invalidRange ? (
        <div className="p-5">
          <InlineAlert title="Invalid date range">
            The end date must fall on or after the start date.
          </InlineAlert>
        </div>
      ) : loading ? (
        <TableSkeleton rows={6} columns={2} />
      ) : error || !report ? (
        <ErrorState message={error ?? "No report data."} onRetry={retry} />
      ) : (
        <>
          <div className="divide-y divide-[var(--line)]">
            <ReportSection
              heading="Income"
              rows={report.income.accounts}
              total={report.income.total}
              formatValue={formatMoney}
            />
            <ReportSection
              heading="Expenses"
              rows={report.purchase_expense.accounts}
              total={report.purchase_expense.total}
              formatValue={formatMoney}
            />
            <ReportSection
              heading="Other Expenses"
              rows={report.other_expense.accounts}
              total={report.other_expense.total}
              formatValue={formatMoney}
            />
          </div>

          <div className="flex items-center justify-between border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)] px-5 py-3">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {profitable ? "Net profit" : "Net loss"}
            </span>
            <span
              className={`tnum font-mono text-[17px] font-semibold ${
                profitable ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
              }`}
            >
              {formatMoney(Math.abs(report.net_income))}
            </span>
          </div>
        </>
      )}
    </ReportShell>
  );
}
