import type { ReactNode } from "react";

/**
 * Split shell for the auth screens — the form is deliberately off-centre against a
 * quiet ledger-styled panel rather than a centred card on an empty page.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <aside className="hidden flex-col justify-between border-r border-[var(--line)] bg-white px-12 py-10 lg:flex">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="grid h-5 w-5 place-items-center rounded bg-zinc-900 text-[11px] font-bold text-white">
            L
          </span>
          LedgerCraft
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tighter text-[var(--text)]">
            Double-entry books for Urban Furniture.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Every order, bill and payment posts a balanced journal entry. Reports read
            straight from the ledger — no stored snapshots, no manual reconciliation.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[var(--line)] bg-[var(--line)]">
            {[
              { label: "Debit", value: "30,000.00" },
              { label: "Credit", value: "30,000.00" },
              { label: "Variance", value: "0.00" },
            ].map((cell) => (
              <div key={cell.label} className="bg-white px-3 py-2.5">
                <dt className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                  {cell.label}
                </dt>
                <dd className="tnum mt-0.5 font-mono text-[13px] text-[var(--text)]">{cell.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-[var(--text-subtle)]">Urban Furniture · Accounting</p>
      </aside>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
