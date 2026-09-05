"use client";

import type { ReactNode } from "react";
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
}

/**
 * Dense list surface shared by every screen. No card wrapper — rows are
 * separated by 1px rules, which is what keeps an accounting table readable.
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
}: DataTableProps<T>) {
  if (loading) return <TableSkeleton columns={columns.length} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
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
          {rows.map((row) => (
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
  );
}
