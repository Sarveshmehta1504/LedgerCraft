"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiError } from "@/lib/api";
import { ReportsApi, type ReportName, type ReportParams } from "@/lib/resources";

/**
 * Report chrome shared by every report: period controls plus the Print / Send
 * actions the mockup puts in the header. `report` and `params` are what the PDF
 * and mail routes need, so the rendered figures and the sent file always cover
 * the same period.
 */
export function ReportShell({
  title,
  subtitle,
  report,
  params,
  controls,
  children,
}: {
  title: string;
  subtitle: string;
  report: ReportName;
  params?: ReportParams;
  controls?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // A report has no contact of its own, so a recipient has to be asked for.
  // It is asked for in the page's own dialog — a browser prompt() is not part
  // of this design and blocks the tab while it is open.
  const [askOpen, setAskOpen] = useState(false);
  const [to, setTo] = useState("");
  const [toError, setToError] = useState<string | null>(null);


  async function onPrint() {
    setPrinting(true);
    setNotice(null);
    setProblem(null);
    try {
      await ReportsApi.pdf(report, params);
      setNotice(`${title} downloaded as a PDF.`);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : "Could not generate the PDF.");
    } finally {
      setPrinting(false);
    }
  }

  async function onSend(event: React.FormEvent) {
    event.preventDefault();
    const recipient = to.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      setToError("Enter a valid email address.");
      return;
    }

    setSending(true);
    setNotice(null);
    setProblem(null);
    setToError(null);
    try {
      await ReportsApi.send(report, recipient, params);
      setAskOpen(false);
      setNotice(`${title} sent to ${recipient}.`);
    } catch (err) {
      setToError(err instanceof ApiError ? err.message : "Could not send the report.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={title}
        subtitle={subtitle}
        trailing={
          <>
            <Button size="sm" onClick={onPrint} disabled={printing}>
              {printing ? "Preparing…" : "Print"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setToError(null);
                setNotice(null);
                setProblem(null);
                setAskOpen(true);
              }}
              disabled={sending}
            >
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

      {problem && (
        <p className="border-b border-[var(--line)] bg-[var(--danger-wash)] px-5 py-2 text-[13px] text-[var(--danger)]">
          {problem}
        </p>
      )}

      {children}

      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        as="form"
        onSubmit={onSend}
        title="Email this report"
        description={`${title}, attached as a PDF for the period on screen.`}
        footer={
          <>
            <Button size="sm" onClick={() => setAskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={sending}>
              {sending ? "Sending…" : "Send report"}
            </Button>
          </>
        }
      >
        <TextField
          label="Send to"
          type="email"
          autoComplete="off"
          placeholder="name@company.com"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setToError(null);
          }}
          error={toError ?? undefined}
          hint="A report has no customer of its own, so it needs an address."
          required
        />
      </Modal>

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
