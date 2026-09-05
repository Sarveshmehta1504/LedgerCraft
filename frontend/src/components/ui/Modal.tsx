"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The app's one dialog. A modal is not a page, so it does not reuse PageHeader:
 * a page puts its primary action first because that bar is scanned top-down,
 * while a dialog is read title → body → decide, which puts the actions last and
 * on the right, where the eye lands after the content.
 *
 * `as="form"` keeps submit-on-Enter working — the footer button is a real
 * submit rather than a click handler pretending to be one.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = "md",
  as = "div",
  padded = true,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
  as?: "div" | "form";
  /** Off when the body brings its own edge-to-edge sections. */
  padded?: boolean;
  onSubmit?: (event: React.FormEvent) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    // The first field, not the panel: a dialog that asks for something should
    // be typeable the moment it appears.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    // Escape closes; Tab is trapped so focus cannot wander onto the page behind.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const targets = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (targets.length === 0) return;
      const edge = event.shiftKey ? targets[0] : targets[targets.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? targets[targets.length - 1] : targets[0]).focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      returnFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-[26rem]", lg: "max-w-lg" };
  const Panel = as;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-900/35 px-4 py-[10vh] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef as never}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onSubmit={onSubmit}
        noValidate={as === "form" ? true : undefined}
        className={`modal-panel w-full ${widths[width]} overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_12px_32px_-8px_rgba(24,24,27,0.18)]`}
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-[13px] leading-snug text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-0.5 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-[var(--text-subtle)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <X size={15} />
          </button>
        </header>

        <div className={padded ? "px-5 pb-5" : "pb-0"}>{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface-sunken)] px-5 py-3">
            {footer}
          </footer>
        )}
      </Panel>
    </div>
  );
}
