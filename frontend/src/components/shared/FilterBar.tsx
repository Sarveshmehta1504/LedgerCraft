"use client";

import type { ReactNode } from "react";

/**
 * The strip of controls that sits between a PageHeader and its table.
 *
 * The markup here was already duplicated verbatim across Contacts, Products and
 * the shared order list; pulling it out is what makes it cheap to put the same
 * controls on the screens that had none. Filtering stays in the browser, over
 * the rows the screen already fetched — same reasoning as the sorting and
 * paging in DataTable.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-2.5">
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  width = "w-64",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  width?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className={`h-8 ${width} rounded-md border border-[var(--line-strong)] px-2.5 text-sm transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]`}
    />
  );
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A row of toggle buttons for a small, known set of values — statuses, contact
 * types. The empty string is the "All" option throughout, so a screen can test
 * a filter with a plain falsy check.
 *
 * Anything with more than about six options wants a ComboboxControl instead;
 * this would wrap onto a second line and stop being scannable.
 */
export function SegmentedFilter<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | "";
  options: FilterOption<T | "">[];
  onChange: (value: T | "") => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value || "all"}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium capitalize transition-colors duration-150 ${
            value === option.value
              ? "bg-[var(--surface-raised)] text-[var(--text)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A from/to pair for filtering by date. Both ends are optional — an open range
 * on either side is a normal thing to ask for ("everything since April").
 */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  label,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label: string;
}) {
  const input =
    "h-8 rounded-md border border-[var(--line-strong)] px-2 text-[13px] text-[var(--text)] transition-colors duration-150 focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)]";

  return (
    <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(event) => onFromChange(event.target.value)}
        aria-label={`${label} from`}
        className={input}
      />
      <span aria-hidden>—</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(event) => onToChange(event.target.value)}
        aria-label={`${label} to`}
        className={input}
      />
    </div>
  );
}

/** Clears every filter at once. Only rendered when something is actually set. */
export function ClearFilters({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="ml-auto h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
    >
      Clear filters
    </button>
  );
}
