"use client";

import { useState } from "react";

/**
 * Ten rows a page. Small enough that the whole page is on screen without
 * scrolling on a laptop, which is what makes the pager worth having at all.
 */
export const DEFAULT_PAGE_SIZE = 10;

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface PagerState {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  /** Index of the first visible row, for the "showing 11–20 of 45" line. */
  start: number;
  shown: number;
  total: number;
  /** False when paging would do nothing — one page, or paging switched off. */
  show: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Client-side paging over rows the caller already holds.
 *
 * Lives apart from DataTable because the card and kanban views need the same
 * behaviour without a table around it, and a second copy of this would drift
 * from the first.
 *
 * Pass `pageSize: 0` to switch paging off and render everything.
 */
export function usePagination<T>(
  rows: T[],
  initialPageSize: number = DEFAULT_PAGE_SIZE,
  pageSizeOptions: number[] = DEFAULT_PAGE_SIZE_OPTIONS,
): { visible: T[]; pager: PagerState; resetPage: () => void } {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Callers filter and search in the browser, so the row count changes under us
  // while the user types. Snapping back to the first page here - during render,
  // the pattern React documents for adjusting state on a changed prop - avoids
  // both an effect and the blank page you would otherwise land on after
  // searching from page three.
  const [countAtLastReset, setCountAtLastReset] = useState(rows.length);
  if (countAtLastReset !== rows.length) {
    setCountAtLastReset(rows.length);
    setPage(1);
  }

  const paged = pageSize > 0;
  const pageCount = paged ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  // Clamped rather than corrected in state: a shrinking list must never leave
  // the view pointing past the end of it, even for a single render.
  const current = Math.min(page, pageCount);
  const start = paged ? (current - 1) * pageSize : 0;
  const visible = paged ? rows.slice(start, start + pageSize) : rows;

  return {
    visible,
    resetPage: () => setPage(1),
    pager: {
      page: current,
      pageCount,
      pageSize,
      pageSizeOptions,
      start,
      shown: visible.length,
      total: rows.length,
      // Gated on the current page size, not the smallest option: otherwise a
      // list of 11-25 rows at a page size of 25 gets a dead pager with both
      // arrows disabled and nothing to click.
      show: paged && rows.length > pageSize,
      setPage,
      setPageSize: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}

/** The footer itself. Renders nothing when paging would have no effect. */
export function Pager({ state, className = "" }: { state: PagerState; className?: string }) {
  if (!state.show) return null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2.5 text-[13px] text-[var(--text-muted)] ${className}`}
    >
      <p aria-live="polite" className="tnum">
        Showing <span className="font-medium text-[var(--text)]">{state.start + 1}</span>–
        <span className="font-medium text-[var(--text)]">{state.start + state.shown}</span> of{" "}
        <span className="font-medium text-[var(--text)]">{state.total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span>Rows</span>
          <select
            value={state.pageSize}
            onChange={(event) => state.setPageSize(Number(event.target.value))}
            className="h-7 rounded-md border border-[var(--line-strong)] bg-white px-1.5 text-[13px] text-[var(--text)]"
          >
            {state.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <PagerButton
            label="Previous page"
            disabled={state.page === 1}
            onClick={() => state.setPage(state.page - 1)}
          >
            ‹
          </PagerButton>
          <span className="tnum px-1.5">
            Page <span className="font-medium text-[var(--text)]">{state.page}</span> of{" "}
            <span className="font-medium text-[var(--text)]">{state.pageCount}</span>
          </span>
          <PagerButton
            label="Next page"
            disabled={state.page === state.pageCount}
            onClick={() => state.setPage(state.page + 1)}
          >
            ›
          </PagerButton>
        </div>
      </div>
    </nav>
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
  children: React.ReactNode;
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
