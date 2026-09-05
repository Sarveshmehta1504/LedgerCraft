"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineAlert } from "@/components/ui/States";
import { LineItemTable, documentTotal } from "@/components/shared/LineItemTable";
import { formatMoney, moneyEquals, today } from "@/lib/format";
import { MOCK_JOURNALS, accountName, contactName } from "@/lib/mock-data";
import type { CustomerInvoice, DocumentLine, PaymentVia, VendorBill } from "@/types";

type Side = "bill" | "invoice";

const COPY = {
  bill: {
    title: "Vendor Bill",
    listHref: "/bills",
    originLabel: "PO",
    originHref: "/purchases",
    partnerLabel: "Vendor",
    /** Posting a bill: Debit Purchase Expense, Credit Creditors. */
    debitAccountId: 9,
    creditAccountId: 5,
    paymentDirection: "Paid to vendor",
  },
  invoice: {
    title: "Customer Invoice",
    listHref: "/invoices",
    originLabel: "SO",
    originHref: "/sales",
    partnerLabel: "Customer",
    /** Posting an invoice: Debit Debtors, Credit Sale Income. */
    debitAccountId: 3,
    creditAccountId: 8,
    paymentDirection: "Received from customer",
  },
};

export function BillForm({
  side,
  document,
}: {
  side: Side;
  document: VendorBill | CustomerInvoice;
}) {
  const router = useRouter();
  const copy = COPY[side];
  const withTax = side === "invoice";

  const isBill = (doc: VendorBill | CustomerInvoice): doc is VendorBill => side === "bill";
  const number = isBill(document) ? document.bill_number : document.invoice_number;
  const reference = isBill(document) ? document.bill_reference : document.invoice_reference;
  const docDate = isBill(document) ? document.bill_date : document.invoice_date;
  const originId = isBill(document) ? document.purchase_order_id : document.sales_order_id;

  const [status, setStatus] = useState<string>(document.status);
  const [lines, setLines] = useState<DocumentLine[]>(document.lines);
  const [amountPaid, setAmountPaid] = useState(document.amount_paid);
  const [busy, setBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentVia, setPaymentVia] = useState<PaymentVia>("bank");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const total = documentTotal(lines, withTax);
  const amountDue = total - amountPaid;
  const isDraft = status === "draft";
  const isPosted = status === "posted";

  async function onPost() {
    // Mirrors the backend's 422 conditions so the user sees the rule before the request.
    if (lines.length === 0 || total <= 0) {
      setPostError("A document with no lines, or a zero total, cannot be posted.");
      return;
    }
    setPostError(null);
    setBusy(true);
    // TODO: replace with real API once backend/<vendor-bills|customer-invoices> is ready
    // (POST /api/{vendor-bills|customer-invoices}/{id}/post).
    await new Promise((resolve) => setTimeout(resolve, 450));
    setBusy(false);
    setStatus("posted");
    setPaymentAmount(total - amountPaid);
  }

  async function onRegisterPayment() {
    if (paymentAmount <= 0) {
      setPaymentError("Enter an amount greater than zero.");
      return;
    }
    // The backend rejects overpayment with a 422 — block it here too rather than let it fail.
    if (paymentAmount > amountDue + 0.001) {
      setPaymentError(
        `Amount exceeds the outstanding balance of ${formatMoney(amountDue)}.`,
      );
      return;
    }
    setPaymentError(null);
    setBusy(true);
    // TODO: replace with real API once backend/payments is ready
    // (POST /api/{vendor-bills|customer-invoices}/{id}/payments).
    await new Promise((resolve) => setTimeout(resolve, 420));
    setBusy(false);

    const nextPaid = amountPaid + paymentAmount;
    setAmountPaid(nextPaid);
    setShowPayment(false);
    if (moneyEquals(nextPaid, total)) setStatus("paid");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader
          title={number}
          subtitle={copy.title}
          actions={
            <div className="flex items-center gap-2">
              {isDraft && (
                <Button variant="primary" size="sm" onClick={onPost} disabled={busy}>
                  {busy ? "Posting…" : "Post"}
                </Button>
              )}
              {isPosted && amountDue > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPaymentAmount(amountDue);
                    setShowPayment(true);
                  }}
                >
                  Register Payment
                </Button>
              )}
            </div>
          }
          trailing={
            <>
              <StatusBadge status={status} />
              <Button size="sm" onClick={() => router.push(copy.listHref)}>
                Back
              </Button>
            </>
          }
        />

        <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-3">
          <TextField
            label={copy.partnerLabel}
            value={contactName(document.contact_id)}
            readOnly
            disabled
          />
          <TextField label="Date" type="date" value={docDate} readOnly disabled />
          <TextField
            label={`${copy.partnerLabel} reference`}
            value={reference ?? "—"}
            readOnly
            disabled
          />
          {/* A document created from an order links back to it; a standalone one hides the link. */}
          {originId !== null && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--text-muted)]">Source</span>
              <a
                href={`${copy.originHref}/${originId}`}
                className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
              >
                {copy.originLabel}/{String(originId).padStart(4, "0")}
              </a>
            </div>
          )}
        </div>

        <LineItemTable
          lines={lines}
          onChange={setLines}
          withTax={withTax}
          readOnly={!isDraft}
          defaultAccountId={copy.creditAccountId}
          priceField={side === "invoice" ? "sales_price" : "cost_price"}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--line)] p-5">
          {postError && <InlineAlert title="Cannot post this document">{postError}</InlineAlert>}

          <div className="flex justify-end">
            <dl className="w-72 space-y-1.5 border-t-2 border-[var(--line-strong)] pt-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Total</dt>
                <dd className="tnum font-mono font-medium">{formatMoney(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Amount paid</dt>
                <dd className="tnum font-mono">{formatMoney(amountPaid)}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-1.5">
                <dt className="font-medium">Amount due</dt>
                <dd
                  className={`tnum font-mono font-semibold ${
                    amountDue <= 0 ? "text-[var(--status-paid)]" : "text-[var(--text)]"
                  }`}
                >
                  {formatMoney(amountDue)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <PageHeader
            title="Register payment"
            subtitle={copy.paymentDirection}
            actions={
              <Button variant="primary" size="sm" onClick={onRegisterPayment} disabled={busy}>
                {busy ? "Recording…" : "Confirm payment"}
              </Button>
            }
            trailing={
              <Button size="sm" onClick={() => setShowPayment(false)}>
                Cancel
              </Button>
            }
          />
          <div className="grid gap-5 p-5 md:grid-cols-3">
            <TextField
              label="Amount"
              type="number"
              min={0}
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(Number(event.target.value))}
              className="tnum font-mono"
              hint={`Outstanding ${formatMoney(amountDue)}`}
              required
            />
            <SelectField
              label="Pay via"
              value={paymentVia}
              onChange={(event) => setPaymentVia(event.target.value as PaymentVia)}
              options={[
                { value: "bank", label: "Bank" },
                { value: "cash", label: "Cash" },
              ]}
              hint="Defaults to Bank."
            />
            <TextField
              label="Date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </div>
          {paymentError && (
            <div className="px-5 pb-5">
              <InlineAlert title="Payment rejected">{paymentError}</InlineAlert>
            </div>
          )}
        </div>
      )}

      {/* The ledger reveal — this is the moment that shows the books are real. */}
      {(isPosted || status === "paid") && (
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <PageHeader title="Journal entry" subtitle="Generated automatically on posting" />
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
                {["Account", "Partner", "Debit", "Credit"].map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                      index >= 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              <tr>
                <td className="px-4 py-2.5">{accountName(copy.debitAccountId)}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">
                  {contactName(document.contact_id)}
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                  {formatMoney(total)}
                </td>
                <td className="px-4 py-2.5" />
              </tr>
              <tr>
                <td className="px-4 py-2.5">{accountName(copy.creditAccountId)}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">
                  {contactName(document.contact_id)}
                </td>
                <td className="px-4 py-2.5" />
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                  {formatMoney(total)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
                <td colSpan={2} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Balanced
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                  {formatMoney(total)}
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                  {formatMoney(total)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-[var(--line)] px-5 py-2.5 text-[13px] text-[var(--text-muted)]">
            Posted to {MOCK_JOURNALS.find((j) => (side === "bill" ? j.type === "purchase" : j.type === "sales"))?.name}.
          </p>
        </div>
      )}
    </div>
  );
}
