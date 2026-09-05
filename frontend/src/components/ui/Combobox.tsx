"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FieldShell } from "./Field";

export interface ComboboxOption {
  value: number;
  label: string;
}

interface ComboboxProps {
  label: string;
  value: number | null;
  options: ComboboxOption[];
  onChange: (value: number | null) => void;
  /** When provided, an unmatched search term can be created inline (many-to-one on the fly). */
  onCreate?: (label: string) => ComboboxOption;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Searchable select with optional create-on-the-fly, for the board's many-to-one
 * fields. Product Category is the case that needs creation: the annotation reads
 * "Category can be created and saved on the fly (Many2one Field)".
 */
export function Combobox({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Search…",
  error,
  hint,
  required,
  disabled,
}: ComboboxProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  const exactMatch = filtered.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = Boolean(onCreate) && query.trim().length > 0 && !exactMatch;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function create() {
    if (!onCreate) return;
    const option = onCreate(query.trim());
    commit(option);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - (canCreate ? 0 : 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex < filtered.length) commit(filtered[activeIndex]);
      else if (canCreate) create();
    }
  }

  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <div ref={wrapRef} className="relative">
        <input
          id={fieldId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${fieldId}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : (selected?.label ?? "")}
          placeholder={selected ? selected.label : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`h-9 w-full cursor-text rounded-md border bg-white px-2.5 text-sm text-[var(--text)] transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:outline-offset-[-1px] focus:outline-[var(--accent)] disabled:bg-[var(--surface-raised)] ${
            error ? "border-[var(--danger)]" : "border-[var(--line-strong)]"
          }`}
        />

        {open && (
          <ul
            id={`${fieldId}-list`}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--line)] bg-white py-1 shadow-[0_12px_24px_-16px_rgba(24,24,27,0.35)]"
          >
            {filtered.map((option, index) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(option)}
                  className={`flex w-full cursor-pointer items-center px-2.5 py-1.5 text-left text-[13px] ${
                    index === activeIndex
                      ? "bg-[var(--surface-raised)] text-[var(--text)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !canCreate && (
              <li className="px-2.5 py-2 text-[13px] text-[var(--text-subtle)]">No matches</li>
            )}

            {canCreate && (
              <li>
                <button
                  type="button"
                  onClick={create}
                  onMouseEnter={() => setActiveIndex(filtered.length)}
                  className={`flex w-full cursor-pointer items-center gap-1.5 border-t border-[var(--line)] px-2.5 py-1.5 text-left text-[13px] ${
                    activeIndex === filtered.length
                      ? "bg-[var(--surface-raised)]"
                      : ""
                  }`}
                >
                  <span className="text-[var(--accent)]">Create</span>
                  <span className="font-medium text-[var(--text)]">“{query.trim()}”</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </FieldShell>
  );
}
