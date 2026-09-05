import type { ReactNode } from "react";

/**
 * The action bar every screen in the mockup shares: primary action on the left,
 * secondary controls (Back / Cancel / Print) on the right.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  trailing,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-5 py-3">
      <div className="flex items-center gap-3">
        {actions}
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </header>
  );
}
