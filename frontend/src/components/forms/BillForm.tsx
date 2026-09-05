"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineAlert } from "@/components/ui/States";
import { LineItemTable } from "@/components/shared/LineItemTable";
import { ApiError } from "@/lib/api";
import { formatMoney, today } from "@/lib/format";
import { AccountsApi, AnalyticAccountsApi, CustomerInvoicesApi, ProductsApi, VendorBillsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { CustomerInvoiceDetail, VendorBillDetail } from "@/lib/resources";
import type { AnalyticAccount, ChartOfAccount, DocumentLine, PaymentVia, Product } from "@/types";

type Side = "bill" | "invoice";

const COPY = {
  bill: {
    title: "Vendor Bill",
    listHref: "/bills",
    originLabel: "PO",
    originHref: "/purchases",
    partnerLabel: "Vendor",
    paymentDirection: "Paid to vendor",
  },
  invoice: {
    title: "Customer Invoice",
    listHref: "/invoices",
    originLabel: "SO",
    originHref: "/sales",
    partnerLabel: "Customer",
    paymentDirection: "Received from customer",
  },
};

export function BillForm({
  side,
  document,
}: {
  side: Side;
  document: VendorBillDetail | CustomerInvoiceDetail;
}) {
  const router = useRouter();
  const copy = COPY[side];
  const withTax = side === "invoice";
  function isBill(doc: VendorBillDetail | CustomerInvoiceDetail): doc is VendorBillDetail {
    return "bill_number" in doc;
  }

  const fetchProducts = useCallback(() => ProductsApi.list(), []);
  const { data: productsData } = useAsyncData<Product[]>(fetchProducts, "Could not load products.");
  const products = productsData ?? [];

  const fetchAccounts = useCallback(() => AccountsApi.list(), []);
  const { data: accountsData } = useAsyncData<ChartOfAccount[]>(fetchAccounts, "Could not load accounts.");
  const accounts = accountsData ?? [];

  const fetchAnalytics = useCallback(() => AnalyticAccountsApi.list(), []);
  const { data: analyticsData } = useAsyncData<AnalyticAccount[]>(
    fetchAnalytics,
    "Could not load analytic accounts.",
  );

  const [doc, setDoc] = useState(document);
  const number = isBill(doc) ? doc.bill_number : doc.invoice_number;
  const reference = isBill(doc) ? doc.bill_reference : doc.invoice_reference;
  const docDate = isBill(doc) ? doc.bill_date : doc.invoice_date;
  const originId = isBill(doc) ? doc.purchase_order_id : doc.sales_order_id;
  const originNumber = isBill(doc) ? doc.purchase_order_number : doc.sales_order_number;

  const [lines] = useState<DocumentLine[]>(doc.lines);
  const [busy, setBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(doc.amount_due);
  const [paymentVia, setPaymentVia] = useState<PaymentVia>("bank");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const amountDue = doc.amount_due;
  const isDraft = doc.status === "draft";
  const isPosted = doc.status === "posted";

  async function onSend() {
    setSending(true);
    setNotice(null);
    // TODO: replace with real API once backend/mail is ready
    // (POST /api/{vendor-bills|customer-invoices}/{id}/send — sent synchronously).
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSending(false);
    setNotice("Document sent to the contact on file.");
  }

  async function onPost() {
    setPostError(null);
    setBusy(true);
    try {
      const updated = isBill(doc) ? await VendorBillsApi.post(doc.id) : await CustomerInvoicesApi.post(doc.id);
      setDoc(updated);
      setPaymentAmount(updated.amount_due);
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : "Could not post this document.");
    } finally {
      setBusy(false);
    }
  }

  async function onRegisterPayment() {
    if (paymentAmount <= 0) {
      setPaymentError("Enter an amount greater than zero.");
      return;
    }
    setPaymentError(null);
    setBusy(true);
    try {
      const input = { amount: paymentAmount, payment_via: paymentVia, date: paymentDate, note: paymentNote || undefined };
      // The payment response's nested document omits contact/journal_entry relations
      // that show/post include — re-fetch the full detail rather than lose them on screen.
      if (isBill(doc)) {
        await VendorBillsApi.registerPayment(doc.id, input);
        setDoc(await VendorBillsApi.get(doc.id));
      } else {
        await CustomerInvoicesApi.registerPayment(doc.id, input);
        setDoc(await CustomerInvoicesApi.get(doc.id));
      }
      setShowPayment(false);
    } catch (err) {
      // The backend rejects overpayment (and other business-rule violations) with a 422.
      setPaymentError(err instanceof ApiError ? err.message : "Could not register this payment.");
    } finally {
      setBusy(false);
    }
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
              <StatusBadge status={doc.status} />
              {/* TODO: replace with real API once backend/documents is ready
                  (GET .../{id}/pdf for Print, POST .../{id}/send for Send). */}
              <Button size="sm" onClick={() => window.print()}>
                Print
              </Button>
              <Button size="sm" onClick={onSend} disabled={busy}>
                {sending ? "Sending…" : "Send"}
              </Button>
              <Button size="sm" onClick={() => router.push("/reports/budget")}>
                Budget
              </Button>
              <Button size="sm" onClick={() => router.push(copy.listHref)}>
                Back
              </Button>
            </>
          }
        />

        <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-3">
          <TextField label={copy.partnerLabel} value={doc.contact_name} readOnly disabled />
          <TextField label="Date" type="date" value={docDate.slice(0, 10)} readOnly disabled />
          <TextField
            label={`${copy.partnerLabel} reference`}
            value={reference ?? "—"}
            readOnly
            disabled
          />
          {/* A document created from an order links back to it; a standalone one hides the link. */}
          {originId !== null && originNumber && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[var(--text-muted)]">Source</span>
              <a
                href={`${copy.originHref}/${originId}`}
                className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
              >
                {originNumber}
              </a>
            </div>
          )}
        </div>

        <LineItemTable
          lines={lines}
          onChange={() => {}}
          withTax={withTax}
          readOnly
          defaultAccountId={null}
          priceField={side === "invoice" ? "sales_price" : "cost_price"}
          products={products}
          accounts={accounts}
          analyticAccounts={analyticsData ?? []}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--line)] p-5">
          {postError && <InlineAlert title="Cannot post this document">{postError}</InlineAlert>}
          {notice && (
            <p className="rounded-md bg-[var(--status-paid-wash)] px-3 py-2 text-[13px] text-[var(--status-paid)]">
              {notice}
            </p>
          )}

          <div className="flex justify-end">
            <dl className="w-72 space-y-1.5 border-t-2 border-[var(--line-strong)] pt-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Total</dt>
                <dd className="tnum font-mono font-medium">{formatMoney(doc.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Amount paid</dt>
                <dd className="tnum font-mono">{formatMoney(doc.amount_paid)}</dd>
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
            {/* Payment Type and Partner are fixed by the document — shown, not editable. */}
            <TextField label="Payment Type" value={side === "bill" ? "Send" : "Receive"} readOnly disabled />
            <TextField
              label="Partner"
              value={doc.contact_name}
              readOnly
              disabled
              hint="Autofilled from the document."
            />
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
              hint="Defaults to today."
            />
            <div className="md:col-span-2">
              <TextField
                label="Note"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="Optional reference"
              />
            </div>
          </div>
          {paymentError && (
            <div className="px-5 pb-5">
              <InlineAlert title="Payment rejected">{paymentError}</InlineAlert>
            </div>
          )}
        </div>
      )}

      {/* The ledger reveal — this is the moment that shows the books are real. */}
      {doc.journal_entry && (
        <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
          <PageHeader title="Journal entry" subtitle="Generated automatically on posting" />
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
                {["Account", "Debit", "Credit"].map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                      index >= 1 ? "text-right" : "text-left"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {doc.journal_entry.lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-4 py-2.5">{line.account_name}</td>
                  <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                    {line.debit > 0 ? formatMoney(line.debit) : ""}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right font-mono text-[13px]">
                    {line.credit > 0 ? formatMoney(line.credit) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
                <td className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Balanced
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                  {formatMoney(doc.journal_entry.lines.reduce((sum, l) => sum + l.debit, 0))}
                </td>
                <td className="tnum px-4 py-2.5 text-right font-mono text-[13px] font-semibold">
                  {formatMoney(doc.journal_entry.lines.reduce((sum, l) => sum + l.credit, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
