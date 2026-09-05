"use client";

import { useCallback } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, CustomerInvoice, VendorBill } from "@/types";

interface PaymentRow {
  id: string;
  document: string;
  contact_id: number;
  amount: number;
  date: string;
  via: string;
}

/**
 * There's no dedicated GET /api/payments endpoint yet, so this derives a
 * payments/receipts view from what's actually been settled on real bills and
 * invoices — real amounts, just not a real payments ledger.
 */
function derivePayments(documents: (VendorBill | CustomerInvoice)[]): PaymentRow[] {
  return documents
    .filter((document) => document.amount_paid > 0)
    .map((document) => ({
      id: `pay-${document.id}`,
      document: "bill_number" in document ? document.bill_number : document.invoice_number,
      contact_id: document.contact_id,
      amount: document.amount_paid,
      date: "bill_date" in document ? document.bill_date : document.invoice_date,
      via: "bank",
    }));
}

export function PaymentList({
  title,
  subtitle,
  partnerLabel,
  fetcher,
}: {
  title: string;
  subtitle: string;
  partnerLabel: string;
  fetcher: () => Promise<(VendorBill | CustomerInvoice)[]>;
}) {
  const derivedFetcher = useCallback(() => fetcher().then(derivePayments), [fetcher]);
  const { data, loading, error, retry } = useAsyncData<PaymentRow[]>(
    derivedFetcher,
    "The payments service did not respond.",
  );
  const rows = data ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  const columns: Column<PaymentRow>[] = [
    {
      key: "document",
      header: "Document",
      render: (row) => <span className="tnum font-mono text-[13px] font-medium">{row.document}</span>,
    },
    { key: "partner", header: partnerLabel, render: (row) => contactName(row.contact_id) },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "via", header: "Via", render: (row) => titleCase(row.via) },
    { key: "amount", header: "Amount", numeric: true, render: (row) => formatMoney(row.amount) },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription="Registering a payment against a posted document records it here."
      />
    </div>
  );
}
