"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ErrorState, InlineAlert, TableSkeleton } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { PortalApi, type PortalInvoice } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { PaymentVia } from "@/types";

/**
 * One of the customer's own invoices, in full.
 *
 * Reads /my/invoices/{id}, which is scoped to the signed-in account's contact —
 * the staff route for the same invoice answers 403 for this role, and so does
 * the server-rendered PDF, so Print here is the browser's own print of this
 * page rather than a download.
 */
export default function PortalInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const fetchInvoice = useCallback(() => PortalApi.invoice(Number(id)), [id]);
  const { data, loading, error, retry } = useAsyncData<PortalInvoice>(
    fetchInvoice,
    "Could not load this invoice.",
  );

  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const current = invoice ?? data;

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [via, setVia] = useState<PaymentVia>("bank");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading && !current) return <TableSkeleton rows={5} columns={4} />;
  if (error && !current) return <ErrorState message={error} onRetry={retry} />;
  if (!current) return <ErrorState message="Invoice not found." onRetry={retry} />;

  const due = current.amount_due;

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    if (amount <= 0 || amount > due) {
      setPayError(`Enter an amount between 0 and ${formatMoney(due)}.`);
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const updated = await PortalApi.pay(current.id, { amount, payment_via: via, note: note || undefined });
      setInvoice(updated);
      setPayOpen(false);
      setNote("");
      setNotice(`Payment of ${formatMoney(amount)} received. Thank you.`);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Could not record that payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="invoice-sheet overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader
          title={current.invoice_number}
          subtitle={`Billed to ${current.contact_name}`}
          actions={
            due > 0 && (
              <span className="no-print">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setAmount(due);
                    setPayOpen((open) => !open);
                  }}
                >
                  Pay {formatMoney(due)}
                </Button>
              </span>
            )
          }
          trailing={
            <>
              <StatusBadge status={current.status} />
              {/* The server PDF route is staff-only (403 for this role) and the
                  portal prefix has no pdf/send of its own, so Print is the
                  browser's own print of this sheet. */}
              <span className="no-print flex items-center gap-2">
                <Button size="sm" onClick={() => window.print()}>
                  Print
                </Button>
                <Button size="sm" onClick={() => router.push("/portal")}>
                  Back
                </Button>
              </span>
            </>
          }
        />

        {notice && (
          <p className="border-b border-[var(--line)] bg-[var(--status-paid-wash)] px-5 py-2 text-[13px] text-[var(--status-paid)]">
            {notice}
          </p>
        )}

        <dl className="grid gap-x-8 gap-y-4 border-b border-[var(--line)] p-5 sm:grid-cols-3">
          {[
            { label: "Invoice date", value: formatDate(current.invoice_date) },
            { label: "Due date", value: current.due_date ? formatDate(current.due_date) : "—" },
            { label: "Reference", value: current.invoice_reference ?? "—" },
          ].map((cell) => (
            <div key={cell.label}>
              <dt className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                {cell.label}
              </dt>
              <dd className="mt-0.5 text-sm text-[var(--text)]">{cell.value}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
                {["Product", "Qty", "Unit price", "Tax", "Total"].map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                      index === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {current.portal_lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-5 py-2.5 text-[var(--text)]">{line.product_name}</td>
                  <td className="tnum px-5 py-2.5 text-right font-mono text-[13px]">{line.quantity}</td>
                  <td className="tnum px-5 py-2.5 text-right font-mono text-[13px]">
                    {formatMoney(line.unit_price)}
                  </td>
                  <td className="tnum px-5 py-2.5 text-right font-mono text-[13px] text-[var(--text-muted)]">
                    {line.tax_percent}% · {formatMoney(line.tax_amount)}
                  </td>
                  <td className="tnum px-5 py-2.5 text-right font-mono text-[13px]">
                    {formatMoney(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-[var(--line)] p-5">
          <dl className="w-64 space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">Total</dt>
              <dd className="tnum font-mono">{formatMoney(current.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">Amount paid</dt>
              <dd className="tnum font-mono">{formatMoney(current.amount_paid)}</dd>
            </div>
            <div className="flex justify-between border-t-2 border-[var(--line-strong)] pt-1.5 font-semibold">
              <dt>Amount due</dt>
              <dd className="tnum font-mono">{formatMoney(due)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {payOpen && due > 0 && (
        <form
          onSubmit={pay}
          noValidate
          className="no-print overflow-hidden rounded-lg border border-[var(--line)] bg-white"
        >
          <PageHeader
            title="Pay this invoice"
            subtitle={`Outstanding ${formatMoney(due)}`}
            actions={
              <Button type="submit" variant="primary" size="sm" disabled={paying}>
                {paying ? "Sending…" : "Confirm payment"}
              </Button>
            }
            trailing={
              <Button size="sm" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
            }
          />
          {payError && (
            <div className="border-b border-[var(--line)] p-5">
              <InlineAlert title={payError} />
            </div>
          )}
          <div className="grid gap-5 p-5 md:grid-cols-3">
            <TextField
              label="Amount"
              type="number"
              min={0}
              max={due}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              required
            />
            <SelectField
              label="Pay via"
              value={via}
              onChange={(event) => setVia(event.target.value as PaymentVia)}
              options={[
                { value: "bank", label: "Bank" },
                { value: "cash", label: "Cash" },
              ]}
              required
            />
            <TextField
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </form>
      )}
    </div>
  );
}
