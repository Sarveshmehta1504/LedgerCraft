"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string | number;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  /** Mirrors the native `<select>` change event shape so callers can keep using `event.target.value`. */
  onChange: (event: { target: { value: string } }) => void;
}

const VIEWPORT_MARGIN = 8;

/**
 * Custom dropdown standing in for a native `<select>`. A native select's option
 * list is rendered by the OS/browser and ignores the page's layout, so it can
 * spill outside a rounded card on narrow screens — this version renders its own
 * panel through a portal and clamps it to the viewport instead.
 */
export function Select({
  id,
  value,
  options,
  placeholder,
  disabled,
  required,
  error,
  className = "",
  onChange,
}: SelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; flip: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    flip: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => String(option.value) === String(value)) ?? null;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < panelHeight + VIEWPORT_MARGIN && rect.top > panelHeight;

    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
      left = Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - width);
    }

    setPosition({
      top: flip ? rect.top : rect.bottom,
      left,
      width,
      flip,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  function commit(option: SelectOption) {
    onChange({ target: { value: String(option.value) } });
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-white px-2.5 text-left text-sm text-[var(--text)] transition-colors duration-150 focus:outline-2 focus:outline-offset-[-1px] focus:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--text-muted)] ${
          error ? "border-[var(--danger)]" : "border-[var(--line-strong)]"
        } ${className}`}
      >
        <span className={selected ? "" : "text-[var(--text-subtle)]"}>
          {selected ? selected.label : placeholder ?? ""}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="shrink-0 text-[var(--text-subtle)]"
          aria-hidden
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={panelRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: position.flip ? undefined : position.top,
              bottom: position.flip ? window.innerHeight - position.top : undefined,
              left: position.left,
              width: position.width,
              marginTop: position.flip ? 0 : 4,
              marginBottom: position.flip ? 4 : 0,
            }}
            className="z-50 max-h-56 overflow-auto rounded-md border border-[var(--line)] bg-white py-1 shadow-[0_12px_24px_-16px_rgba(24,24,27,0.35)]"
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                  onClick={() => commit(option)}
                  className={`flex w-full cursor-pointer items-center px-2.5 py-1.5 text-left text-[13px] ${
                    String(option.value) === String(value)
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text)] hover:bg-[var(--surface-raised)]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
