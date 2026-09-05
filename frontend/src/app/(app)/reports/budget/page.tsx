"use client";

import { useCallback, useState } from "react";
import { ReportShell } from "@/components/shared/ReportShell";
import { BudgetPie } from "@/components/shared/BudgetPie";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatMoney } from "@/lib/format";
import { useAsyncData } from "@/lib/use-async-data";
import { ReportsApi } from "@/lib/resources";
import { titleCase } from "@/lib/format";
import type { BudgetReport, BudgetReportRow } from "@/types";

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

/**
 * Achieved against planned for one budget, as a share of whole — which is what
 * the spec asks the kanban card to show. Drawn with a conic-gradient rather
 * than a chart library: it is two slices at a fixed 56px, so a canvas, a
 * ResizeObserver and a legend would all be overhead for nothing.
 */
function BudgetDonut({ planned, actual }: { planned: number; actual: number }) {
  const ratio = planned > 0 ? Math.min(actual / planned, 1) : 0;
  const percent = Math.round(ratio * 100);
  const over = actual > planned;
  const filled = over ? "var(--status-paid)" : "var(--accent)";

  return (
    <div
      role="img"
      aria-label={`${percent}% of planned achieved`}
      className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${filled} 0 ${ratio * 360}deg, var(--surface-raised) ${
          ratio * 360
        }deg 360deg)`,
      }}
    >
      <span className="tnum grid h-9 w-9 place-items-center rounded-full bg-white font-mono text-[11px] font-medium text-[var(--text)]">
        {percent}%
      </span>
    </div>
  );
}

export default function BudgetReportPage() {
  const [view, setView] = useState<ViewMode>("list");
  const fetchData = useCallback(() => ReportsApi.budget(), []);
  const { data, loading, error, retry } = useAsyncData<BudgetReport>(
    fetchData,
    "The reporting service did not respond.",
  );
  const rows = data?.rows ?? [];
  // A revised budget is superseded by its replacement and a cancelled one never
  // ran, so both are listed for the audit trail but kept out of every figure.
  const live = rows.filter((row) => row.counted_in_totals);

  return (
    <ReportShell
      report="budget"
      title="Budget Report"
      subtitle="Planned versus achieved by analytic account"
      controls={<ViewSwitcher value={view} onChange={setView} />}
    >
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
          {/* Kanban shows a share-of-whole per budget, which is what the spec
              asks for; the list keeps the dense comparison. Superseded and
              cancelled budgets appear in both and count in neither. */}
          {view === "kanban" ? (
            <>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => (
                <article
                  key={row.budget_id}
                  className={`rounded-lg border border-[var(--line)] bg-white p-4 ${
                    row.counted_in_totals ? "" : "opacity-55"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <BudgetDonut planned={row.planned_amount} actual={row.actual_amount} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{row.name}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-subtle)]">
                        {row.analytic_account}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                          row.counted_in_totals
                            ? "bg-[var(--accent-wash,#eef2ff)] text-[var(--accent)]"
                            : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                        }`}
                        title={
                          row.counted_in_totals
                            ? undefined
                            : "Listed for the record, excluded from every total"
                        }
                      >
                        {titleCase(row.status)}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-3 space-y-1 border-t border-[var(--line)] pt-2.5 text-[13px]">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-xs text-[var(--text-subtle)]">Planned</dt>
                      <dd className="tnum font-mono">{formatMoney(row.planned_amount)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-xs text-[var(--text-subtle)]">Achieved</dt>
                      <dd className="tnum font-mono">{formatMoney(row.actual_amount)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-xs text-[var(--text-subtle)]">Variance</dt>
                      <dd
                        className={`tnum font-mono font-medium ${
                          row.variance >= 0 ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
                        }`}
                      >
                        {row.variance >= 0 ? "+" : "\u2212"}
                        {formatMoney(Math.abs(row.variance))}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            {data && (
              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-[var(--line)] px-5 py-3 text-[13px]">
                <div className="flex items-baseline gap-2">
                  <dt className="text-[var(--text-muted)]">Total planned</dt>
                  <dd className="tnum font-mono font-semibold">{formatMoney(data.total_planned)}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-[var(--text-muted)]">Achieved</dt>
                  <dd className="tnum font-mono font-semibold">{formatMoney(data.total_actual)}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-[var(--text-muted)]">Remaining</dt>
                  <dd className="tnum font-mono font-semibold">{formatMoney(data.total_remaining)}</dd>
                </div>
                <p className="ml-auto text-[var(--text-subtle)]">Live budgets only</p>
              </dl>
            )}
            </>
          ) : (
            <>
            <div className="grid divide-y divide-[var(--line)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <BudgetChart rows={live} />
              <BudgetPie
                data={live.map((row) => ({ name: row.analytic_account, value: row.planned_amount }))}
              />
            </div>
            <div className="overflow-x-auto border-t border-[var(--line)]">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
                    {["Budget", "Analytic account", "Status", "Planned", "Achieved", "Variance"].map(
                      (header, index) => (
                        <th
                          key={header}
                          scope="col"
                          className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                            index >= 3 ? "text-right" : "text-left"
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
                    <tr key={row.budget_id} className={row.counted_in_totals ? "" : "opacity-55"}>
                      <td className="px-4 py-2.5 font-medium">{row.name}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">{row.analytic_account}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                            row.counted_in_totals
                              ? "bg-[var(--accent-wash,#eef2ff)] text-[var(--accent)]"
                              : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                          }`}
                          title={
                            row.counted_in_totals
                              ? undefined
                              : "Listed for the record, excluded from every total"
                          }
                        >
                          {titleCase(row.status)}
                        </span>
                      </td>
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
                {data && (
                  <tfoot>
                    <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
                      <td className="px-4 py-2.5 text-[13px] font-semibold" colSpan={3}>
                        Total{" "}
                        <span className="font-normal text-[var(--text-muted)]">
                          (live budgets only)
                        </span>
                      </td>
                      <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                        {formatMoney(data.total_planned)}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                        {formatMoney(data.total_actual)}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                        {formatMoney(data.total_remaining)} left
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            </>
          )}
        </>
      )}
    </ReportShell>
  );
}
