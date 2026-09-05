"use client";

import { useCallback, useState } from "react";
import { ReportSection, ReportShell } from "@/components/shared/ReportShell";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatMoney, moneyEquals, today } from "@/lib/format";
import { mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import { buildBalanceSheet } from "@/lib/reports";
import type { BalanceSheet } from "@/types";

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(today());
  // TODO: replace with real API once backend/reports is ready (GET /api/reports/balance-sheet?as_of=…).
  const fetchData = useCallback(() => mockRequest(buildBalanceSheet()), []);
  const { data, loading, error, retry } = useAsyncData<BalanceSheet>(
    fetchData,
    "The reporting service did not respond.",
  );
  const report = data ?? null;

  const totalLiabilities = report?.liabilities.reduce((sum, row) => sum + row.balance, 0) ?? 0;
  const totalCapital = report?.capital.reduce((sum, row) => sum + row.balance, 0) ?? 0;
  const balances = report
    ? moneyEquals(report.total_assets, report.total_liabilities_and_capital)
    : false;

  return (
    <ReportShell
      title="Balance Sheet"
      subtitle="Assets against liabilities and capital"
      controls={
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">As of</span>
          <input
            type="date"
            value={asOf}
            onChange={(event) => setAsOf(event.target.value)}
            className="h-8 rounded-md border border-[var(--line-strong)] px-2.5 text-sm focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]"
          />
        </label>
      }
    >
      {loading ? (
        <TableSkeleton rows={8} columns={2} />
      ) : error || !report ? (
        <ErrorState message={error ?? "No report data."} onRetry={retry} />
      ) : (
        <>
          <div className="grid divide-y divide-[var(--line)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div>
              <ReportSection
                heading="Assets"
                rows={report.assets}
                total={report.total_assets}
                formatValue={formatMoney}
              />
            </div>
            <div className="divide-y divide-[var(--line)]">
              <ReportSection
                heading="Liabilities"
                rows={report.liabilities}
                total={totalLiabilities}
                formatValue={formatMoney}
              />
              <ReportSection
                heading="Capital"
                rows={report.capital}
                total={totalCapital}
                formatValue={formatMoney}
              />
            </div>
          </div>

          {/* Balance check — the strongest signal that the ledger is actually correct. */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 border-t-2 px-5 py-3 ${
              balances
                ? "border-[var(--status-paid)] bg-[var(--status-paid-wash)]"
                : "border-[var(--danger)] bg-[var(--danger-wash)]"
            }`}
          >
            <span
              className={`text-[13px] font-semibold ${
                balances ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
              }`}
            >
              {balances ? "Balance check passed" : "Balance check failed"}
            </span>
            <div className="flex items-center gap-6 text-[13px]">
              <span className="text-[var(--text-muted)]">
                Total assets{" "}
                <span className="tnum font-mono font-semibold text-[var(--text)]">
                  {formatMoney(report.total_assets)}
                </span>
              </span>
              <span className="text-[var(--text-muted)]">
                Liabilities + capital{" "}
                <span className="tnum font-mono font-semibold text-[var(--text)]">
                  {formatMoney(report.total_liabilities_and_capital)}
                </span>
              </span>
            </div>
          </div>
        </>
      )}
    </ReportShell>
  );
}
