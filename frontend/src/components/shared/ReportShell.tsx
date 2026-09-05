"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";

/**
 * Report chrome shared by every report: period controls plus the Print / Send
 * actions the mockup puts in the header.
 */
export function ReportShell({
  title,
  subtitle,
  controls,
  children,
}: {
  title: string;
  subtitle: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSend() {
    setSending(true);
    setNotice(null);
    // TODO: replace with real API once backend/reports is ready
    // (POST /api/reports/{report}/send — mail is synchronous, so keep the spinner until it resolves).
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSending(false);
    setNotice("Report queued for delivery.");
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={title}
        subtitle={subtitle}
        trailing={
          <>
            {/* TODO: replace with real API once backend/reports is ready (GET /api/reports/{report}/pdf). */}
            <Button size="sm" onClick={() => window.print()}>
              Print
            </Button>
            <Button size="sm" onClick={onSend} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
            <Button size="sm" onClick={() => router.push("/dashboard")}>
              Back
            </Button>
          </>
        }
      />

      {controls && (
        <div className="flex flex-wrap items-end gap-4 border-b border-[var(--line)] px-5 py-3">
          {controls}
        </div>
      )}

      {notice && (
        <p className="border-b border-[var(--line)] bg-[var(--status-paid-wash)] px-5 py-2 text-[13px] text-[var(--status-paid)]">
          {notice}
        </p>
      )}

      {children}
    </div>
  );
}

/** A titled block of account rows with its own subtotal — the standard report section. */
export function ReportSection({
  heading,
  rows,
  total,
  formatValue,
}: {
  heading: string;
  rows: { account: string; balance: number }[];
  total: number;
  formatValue: (value: number) => string;
}) {
  return (
    <section>
      <h3 className="bg-[var(--surface-sunken)] px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {heading}
      </h3>
      <table className="w-full border-collapse text-sm">
        <tbody className="divide-y divide-[var(--line)]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-5 py-3 text-[13px] text-[var(--text-subtle)]">
                No transactions in this period.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.account}>
                <td className="px-5 py-2 text-[var(--text)]">{row.account}</td>
                <td className="tnum px-5 py-2 text-right font-mono text-[13px]">
                  {formatValue(row.balance)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--line-strong)] bg-white">
            <td className="px-5 py-2 text-[13px] font-semibold">Total {heading.toLowerCase()}</td>
            <td className="tnum px-5 py-2 text-right font-mono text-[13px] font-semibold">
              {formatValue(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
