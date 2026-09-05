"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Pager, usePagination } from "@/components/shared/Pagination";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/States";

/** What a cell sorts on. Dates sort correctly as the ISO strings the API sends. */
export type SortValue = string | number | null | undefined;

export interface Column<T> {
  key: string;
  header: string;
  /** Right-align and tabular-align numeric columns. */
  numeric?: boolean;
  width?: string;
  render: (row: T) => ReactNode;
  /**
   * Makes the column sortable. `render` returns a ReactNode, which cannot be
   * compared, so a sortable column has to say what its underlying value is —
   * a number for money and counts, a string for names, an ISO string for dates.
   */
  sortValue?: (row: T) => SortValue;
}

type SortDirection = "asc" | "desc";

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

/**
 * Dense list surface shared by every screen. No card wrapper — rows are
 * separated by 1px rules, which is what keeps an accounting table readable.
 *
 * Sorting and paging are both done here, over the rows the caller already
 * holds, rather than against the API. Every screen filters and searches its
 * list in the browser, so server-side paging would silently narrow those to the
 * current page; and the dashboard counts statuses by reducing over whole lists,
 * which would start reporting page-one figures with nothing on screen to say
 * so. The largest list the API returns is 22 KB, so there is nothing to win by
 * splitting it up.
 *
 * Order matters: sort the whole list, then slice. Sorting only the visible page
 * would reorder twenty-five rows within that page and leave every other row
 * where it was, which looks like a bug and is one.
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
  pageSize,
  pageSizeOptions,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;

    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return rows;

    const read = column.sortValue;
    const factor = sort.direction === "asc" ? 1 : -1;

    // Copied before sorting: `rows` belongs to the caller, and sorting in place
    // would reorder an array a parent is holding in state.
    return [...rows].sort((a, b) => factor * compare(read(a), read(b)));
  }, [rows, columns, sort]);

  // Paging runs on the sorted list, never the other way round.
  const { visible, pager, resetPage } = usePagination(sortedRows, pageSize, pageSizeOptions);

  if (loading) return <TableSkeleton columns={columns.length} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  /** Ascending, then descending, then back to whatever order the caller sent. */
  function toggleSort(key: string) {
    // A new order makes the current page number meaningless.
    resetPage();
    setSort((previous) => {
      if (previous?.key !== key) return { key, direction: "asc" };
      if (previous.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const active = sort?.key === column.key;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={`text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                      column.numeric ? "text-right" : "text-left"
                    } ${sortable ? "p-0" : "px-4 py-2"}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={`group flex w-full cursor-pointer items-center gap-1 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 hover:text-[var(--text)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
                          column.numeric ? "justify-end" : "justify-start"
                        } ${active ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}
                      >
                        {column.header}
                        <SortMarker direction={active ? sort.direction : null} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
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

      <Pager state={pager} />
    </div>
  );
}

/**
 * Blanks always sort last, in both directions: a contact with no mobile number
 * belongs at the bottom of the list whichever way the column points, not
 * floated to the top by an empty string.
 *
 * Strings go through localeCompare with the numeric option, which is what keeps
 * Bill/2026/0009 ahead of Bill/2026/0010 instead of sorting them lexically.
 */
function compare(a: SortValue, b: SortValue): number {
  const aBlank = a === null || a === undefined || a === "";
  const bBlank = b === null || b === undefined || b === "";
  if (aBlank || bBlank) return aBlank && bBlank ? 0 : aBlank ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function SortMarker({ direction }: { direction: SortDirection | null }) {
  // Held at zero opacity rather than unmounted, so a header does not change
  // width the moment its column becomes sorted.
  return (
    <span
      aria-hidden
      className={
        direction === null ? "opacity-0 transition-opacity group-hover:opacity-40" : undefined
      }
    >
      {direction === "desc" ? "↓" : "↑"}
    </span>
  );
}
