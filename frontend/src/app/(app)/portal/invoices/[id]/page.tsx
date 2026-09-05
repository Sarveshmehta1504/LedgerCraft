"use client";

import { Banknote, Check, Landmark } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
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
  // Most customers clear the whole balance, so "in full" is the default and the
  // amount box only appears when they choose otherwise.
  const [mode, setMode] = useState<"full" | "part">("full");
  const [amount, setAmount] = useState(0);
  const [via, setVia] = useState<PaymentVia>("bank");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [printing, setPrinting] = useState(false);
  const [sending, setSending] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  if (loading && !current) return <TableSkeleton rows={5} columns={4} />;
  if (error && !current) return <ErrorState message={error} onRetry={retry} />;
  if (!current) return <ErrorState message="Invoice not found." onRetry={retry} />;

  const due = current.amount_due;

  /**
   * Prefers the server's own PDF so the customer gets the same document the
   * back office sends. That route is not published under /my yet, so a 404 or
   * 403 falls through to the browser printing this sheet, which the print
   * stylesheet already formats as an invoice.
   */
  async function printInvoice() {
    if (!current) return;
    setPrinting(true);
    setDocError(null);
    try {
      await PortalApi.pdf(current.id, current.invoice_number);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) window.print();
      else setDocError(err instanceof ApiError ? err.message : "Could not produce this invoice.");
    } finally {
      setPrinting(false);
    }
  }

  async function sendInvoice() {
    if (!current) return;
    setSending(true);
    setDocError(null);
    setNotice(null);
    try {
      await PortalApi.send(current.id);
      setNotice(`${current.invoice_number} has been emailed to you.`);
    } catch (err) {
      setDocError(
        err instanceof ApiError && err.status === 404
          ? "Emailing an invoice is not available on this account yet. Use Print to save a copy."
          : err instanceof ApiError
            ? err.message
            : "Could not email this invoice.",
      );
    } finally {
      setSending(false);
    }
  }

  /** What the confirm button will actually send. */
  const payable = mode === "full" ? due : amount;

  function openPayment() {
    setMode("full");
    setAmount(due);
    setReference("");
    setNote("");
    setPayError(null);
    setPayOpen(true);
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!current) return;
    if (payable <= 0 || payable > due) {
      setPayError(`Enter an amount between 0 and ${formatMoney(due)}.`);
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const updated = await PortalApi.pay(current.id, {
        amount: payable,
        payment_via: via,
        reference: reference || undefined,
        note: note || undefined,
      });
      setInvoice(updated);
      setPayOpen(false);
      setNotice(`Payment of ${formatMoney(payable)} received. Thank you.`);
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
                <Button variant="primary" size="sm" onClick={openPayment}>
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
                <Button size="sm" disabled={printing} onClick={printInvoice}>
                  {printing ? "Preparing…" : "Print"}
                </Button>
                <Button size="sm" disabled={sending} onClick={sendInvoice}>
                  {sending ? "Sending…" : "Send"}
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

        {docError && (
          <div className="no-print border-b border-[var(--line)] p-5">
            <InlineAlert title={docError} />
          </div>
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

      <Modal
        open={payOpen && due > 0}
        onClose={() => setPayOpen(false)}
        as="form"
        onSubmit={pay}
        width="lg"
        padded={false}
        title="Confirm payment"
        description={`${current.invoice_number} · billed to ${current.contact_name}`}
        footer={
          <>
            <span className="mr-auto text-[13px] text-[var(--text-muted)]">
              You&rsquo;ll pay{" "}
              <span className="tnum font-mono font-semibold text-[var(--text)]">
                {formatMoney(payable > 0 ? payable : 0)}
              </span>
            </span>
            <Button size="sm" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={paying || payable <= 0}>
              {paying ? "Recording…" : `Pay ${formatMoney(payable > 0 ? payable : 0)}`}
            </Button>
          </>
        }
      >
        {/* The figure is the whole point of a checkout, so it leads — mono and
            tabular so the digits do not shift as the amount changes. */}
        <div className="border-y border-[var(--line)] bg-[var(--surface-sunken)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
            Amount due
          </p>
          <p className="tnum mt-0.5 font-mono text-[28px] font-semibold leading-none tracking-tight text-[var(--text)]">
            {formatMoney(due)}
          </p>
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            {formatMoney(current.amount_paid)} of {formatMoney(current.total)} already paid
          </p>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          {payError && <InlineAlert title={payError} />}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-medium text-[var(--text-muted)]">
              How much are you paying?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                selected={mode === "full"}
                onSelect={() => {
                  setMode("full");
                  setPayError(null);
                }}
                title="Pay in full"
                caption={formatMoney(due)}
              />
              <ChoiceCard
                selected={mode === "part"}
                onSelect={() => {
                  setMode("part");
                  setPayError(null);
                }}
                title="Part payment"
                caption="Choose an amount"
              />
            </div>
            {mode === "part" && (
              <div className="mt-1">
                <TextField
                  label="Amount to pay"
                  type="number"
                  min={0}
                  max={due}
                  step="0.01"
                  value={amount}
                  onChange={(event) => {
                    setAmount(Number(event.target.value));
                    setPayError(null);
                  }}
                  className="tnum font-mono"
                  hint={`Anything up to ${formatMoney(due)}. The balance stays on the invoice.`}
                  required
                />
              </div>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-medium text-[var(--text-muted)]">
              How are you paying?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                selected={via === "bank"}
                onSelect={() => setVia("bank")}
                icon={<Landmark size={16} />}
                title="Bank transfer"
                caption="NEFT, IMPS or UPI"
              />
              <ChoiceCard
                selected={via === "cash"}
                onSelect={() => setVia("cash")}
                icon={<Banknote size={16} />}
                title="Cash"
                caption="Paid in person"
              />
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={via === "bank" ? "UTR or transaction ID" : "Receipt number"}
              hint="Optional, but it makes this easy to trace later."
            />
            <TextField
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything we should know"
            />
          </div>

          {/* An honest trust line: this records a payment against the ledger, it
              is not a card gateway, and saying otherwise would be a lie. */}
          <p className="text-[12px] leading-relaxed text-[var(--text-subtle)]">
            Confirming records this payment against {current.invoice_number} straight away and
            updates your balance. Urban Furniture never asks for card or UPI PIN details here.
          </p>
        </div>
      </Modal>

    </div>
  );
}

/**
 * A tappable option tile. Real checkouts use these instead of a `<select>`
 * because the choice is short, and seeing every option at once is faster than
 * opening a list to read two items.
 */
function ChoiceCard({
  selected,
  onSelect,
  title,
  caption,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  caption: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent-wash)]"
          : "border-[var(--line-strong)] bg-white hover:bg-[var(--surface-sunken)]"
      }`}
    >
      {icon && (
        <span className={selected ? "text-[var(--accent)]" : "text-[var(--text-subtle)]"}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-[var(--text)]">{title}</span>
        <span className="tnum block font-mono text-[12px] text-[var(--text-muted)]">{caption}</span>
      </span>
      <span
        aria-hidden="true"
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          selected
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-[var(--line-strong)]"
        }`}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </span>
    </button>
  );
}
