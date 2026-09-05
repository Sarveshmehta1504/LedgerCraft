"use client";

export type ViewMode = "list" | "kanban";

/**
 * List / Kanban toggle used by the master-data screens. List is always the
 * default landing view (universal CRUD pattern from the mockup).
 */
export function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const modes: { id: ViewMode; label: string }[] = [
    { id: "list", label: "List" },
    { id: "kanban", label: "Kanban" },
  ];

  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex overflow-hidden rounded-md border border-[var(--line-strong)] bg-white"
    >
      {modes.map((mode, index) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode.id)}
            className={`h-7 cursor-pointer px-2.5 text-[13px] font-medium transition-colors duration-150 ${
              index > 0 ? "border-l border-[var(--line-strong)]" : ""
            } ${
              active
                ? "bg-zinc-900 text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
