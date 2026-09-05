"use client";

import { useCallback } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { contactName, mockRequest } from "@/lib/mock-data";
import { useAsyncData } from "@/lib/use-async-data";
import type { CustomerInvoice, VendorBill } from "@/types";

interface PaymentRow {
  id: string;
  document: string;
  contact_id: number;
  amount: number;
  date: string;
  via: string;
}

/**
 * Payments and receipts are derived from what has been settled against each
 * document. Once the payments endpoint exists this reads it directly instead.
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
  source,
}: {
  title: string;
  subtitle: string;
  partnerLabel: string;
  source: (VendorBill | CustomerInvoice)[];
}) {
  // TODO: replace with real API once backend/payments is ready (GET /api/payments).
  const fetchData = useCallback(() => mockRequest(derivePayments(source)), [source]);
  const { data, loading, error, retry } = useAsyncData<PaymentRow[]>(
    fetchData,
    "The payments service did not respond.",
  );
  const rows = data ?? [];

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
