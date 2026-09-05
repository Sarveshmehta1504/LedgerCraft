"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FieldShell } from "./Field";

export interface ComboboxOption {
  value: number;
  label: string;
  /** Shown right-aligned and dimmed — a code, a price, anything that disambiguates. */
  meta?: string;
}

interface ControlProps {
  value: number | null;
  options: ComboboxOption[];
  onChange: (value: number | null) => void;
  /** When provided, an unmatched search term can be created inline (many-to-one on the fly). */
  onCreate?: (label: string) => ComboboxOption | Promise<ComboboxOption>;
  placeholder?: string;
  /** Adds a "clear" entry at the top of the list for genuinely optional fields. */
  clearLabel?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** `sm` matches the 32px controls used inside document line tables. */
  size?: "sm" | "md";
  id?: string;
  ariaLabel?: string;
}

/**
 * The searchable control itself, without a label.
 *
 * The list is portalled to `document.body` and positioned from the input's
 * bounding box. Any ancestor with `overflow` — a line-item table's horizontal
 * scroller, a card, a dialog — would otherwise clip an absolutely positioned
 * list, and these fields live inside all three.
 */
export function ComboboxControl({
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Search…",
  clearLabel,
  invalid,
  required,
  disabled,
  size = "md",
  id,
  ariaLabel,
}: ControlProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.label} ${option.meta ?? ""}`.toLowerCase().includes(term),
    );
  }, [options, query]);

  const exactMatch = filtered.some(
    (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = Boolean(onCreate) && query.trim().length > 0 && !exactMatch;
  const showClear = Boolean(clearLabel) && value !== null && query.trim().length === 0;

  function place() {
    const box = inputRef.current?.getBoundingClientRect();
    if (box) setRect({ top: box.bottom + 4, left: box.left, width: box.width });
  }

  useEffect(() => {
    if (!open) return;
    place();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (inputRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    }
    // The list is fixed-positioned, so it has to follow the field when anything
    // between them scrolls — hence capture, which sees scroll on any ancestor.
    function reposition() {
      place();
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function commit(option: ComboboxOption) {
    onChange(option.value);
    close();
  }

  async function create() {
    if (!onCreate) return;
    const option = await onCreate(query.trim());
    commit(option);
  }

  /** Rows in list order, so the keyboard and the pointer agree on what is where. */
  const rows: { key: string; render: () => React.ReactNode; act: () => void }[] = [];
  if (showClear) {
    rows.push({
      key: "clear",
      act: () => {
        onChange(null);
        close();
      },
      render: () => <span className="text-[var(--text-subtle)]">{clearLabel}</span>,
    });
  }
  for (const option of filtered) {
    rows.push({
      key: `option-${option.value}`,
      act: () => commit(option),
      render: () => (
        <>
          <span className="truncate">{option.label}</span>
          {option.meta && (
            <span className="tnum ml-auto pl-3 font-mono text-[12px] text-[var(--text-subtle)]">
              {option.meta}
            </span>
          )}
        </>
      ),
    });
  }
  if (canCreate) {
    rows.push({
      key: "create",
      act: () => void create(),
      render: () => (
        <>
          <span className="text-[var(--accent)]">Create</span>
          <span className="ml-1.5 font-medium text-[var(--text)]">&ldquo;{query.trim()}&rdquo;</span>
        </>
      ),
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, rows.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      rows[activeIndex]?.act();
      return;
    }
    if (event.key === "Tab") close();
  }

  const height = size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm";

  return (
    <>
      <input
        ref={inputRef}
        id={fieldId}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${fieldId}-list`}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        required={required && value === null}
        value={open ? query : (selected?.label ?? "")}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        // Focus alone is not enough: clicking a field that already has focus
        // fires no focus event, so a closed list would stay closed.
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`${height} w-full cursor-text rounded-md border bg-white px-2.5 text-[var(--text)] transition-colors duration-150 placeholder:text-[var(--text-subtle)] focus:outline-2 focus:outline-offset-[-1px] focus:outline-[var(--accent)] disabled:cursor-default disabled:bg-[var(--surface-raised)] ${
          invalid ? "border-[var(--danger)]" : "border-[var(--line-strong)]"
        }`}
      />

      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={`${fieldId}-list`}
            role="listbox"
            style={{ top: rect.top, left: rect.left, minWidth: rect.width }}
            className="fixed z-[60] max-h-64 overflow-auto rounded-md border border-[var(--line)] bg-white py-1 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_12px_28px_-10px_rgba(24,24,27,0.28)]"
          >
            {rows.map((row, index) => (
              <li key={row.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={row.key === `option-${value}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  // mousedown would blur the input and close the list first.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={row.act}
                  className={`flex w-full cursor-pointer items-center px-2.5 py-1.5 text-left text-[13px] ${
                    index === activeIndex
                      ? "bg-[var(--surface-raised)] text-[var(--text)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {row.render()}
                </button>
              </li>
            ))}

            {rows.length === 0 && (
              <li className="px-2.5 py-2 text-[13px] text-[var(--text-subtle)]">No matches</li>
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}

interface ComboboxProps extends ControlProps {
  label: string;
  error?: string;
  hint?: string;
}

/** The labelled form field: everything above, wrapped in the shared field shell. */
export function Combobox({ label, error, hint, required, ...control }: ComboboxProps) {
  const fieldId = useId();
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <ComboboxControl {...control} id={fieldId} required={required} invalid={Boolean(error)} />
    </FieldShell>
  );
}
