"use client";

import { useState, type ReactNode } from "react";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/States";

export interface Column<T> {
  key: string;
  header: string;
  /** Right-align and tabular-align numeric columns. */
  numeric?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /**
   * Rows per page. Pass 0 to render every row and hide the pager entirely —
   * for a short fixed list where a footer would be noise.
   */
  pageSize?: number;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

/**
 * Dense list surface shared by every screen. No card wrapper — rows are
 * separated by 1px rules, which is what keeps an accounting table readable.
 *
 * Paging is done here, over the rows the caller already holds, rather than
 * against the API. Every screen filters and searches its list in the browser,
 * so server-side paging would silently narrow those to the current page; and
 * the dashboard counts statuses by reducing over whole lists, which would start
 * reporting page-one figures with nothing on screen to say so. The largest list
 * the API returns is 22 KB, so there is nothing to win by splitting it up.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records you create will appear in this list.",
  emptyAction,
  pageSize: initialPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filtering happens in the caller, so the row count changes under us when the
  // user types in a search box. Snapping back to the first page here - during
  // render, the pattern React documents for adjusting state on a prop change -
  // avoids both an effect and the blank page you would otherwise land on after
  // searching from page three.
  const [countAtLastReset, setCountAtLastReset] = useState(rows.length);
  if (countAtLastReset !== rows.length) {
    setCountAtLastReset(rows.length);
    setPage(1);
  }

  if (loading) return <TableSkeleton columns={columns.length} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const paged = pageSize > 0;
  const pageCount = paged ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  // Clamped rather than corrected in state: shrinking the list must never leave
  // the table pointing past the end of it, even for one render.
  const current = Math.min(page, pageCount);
  const start = paged ? (current - 1) * pageSize : 0;
  const visible = paged ? rows.slice(start, start + pageSize) : rows;
  // The footer appears only when paging actually does something. Gating on the
  // smallest *option* instead of the current page size put a dead pager under
  // every list of 11-25 rows: one page, both arrows disabled, nothing to click.
  const showPager = paged && rows.length > pageSize;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                    column.numeric ? "text-right" : "text-left"
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
                className={`bg-white transition-colors duration-150 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-[var(--surface-sunken)] focus:bg-[var(--surface-sunken)] focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--accent)]"
                    : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 align-middle text-[var(--text)] ${
                      column.numeric ? "tnum text-right font-mono text-[13px]" : "text-left"
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPager && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2.5 text-[13px] text-[var(--text-muted)]"
        >
          <p aria-live="polite" className="tnum">
            Showing <span className="font-medium text-[var(--text)]">{start + 1}</span>–
            <span className="font-medium text-[var(--text)]">{start + visible.length}</span> of{" "}
            <span className="font-medium text-[var(--text)]">{rows.length}</span>
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-7 rounded-md border border-[var(--line-strong)] bg-white px-1.5 text-[13px] text-[var(--text)]"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <PagerButton
                label="Previous page"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                ‹
              </PagerButton>
              <span className="tnum px-1.5">
                Page <span className="font-medium text-[var(--text)]">{current}</span> of{" "}
                <span className="font-medium text-[var(--text)]">{pageCount}</span>
              </span>
              <PagerButton
                label="Next page"
                disabled={current === pageCount}
                onClick={() => setPage(current + 1)}
              >
                ›
              </PagerButton>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-[var(--line-strong)] bg-white text-[var(--text)] transition-colors duration-150 hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {children}
    </button>
  );
}
