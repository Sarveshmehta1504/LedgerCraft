"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { contactName, mockRequest } from "@/lib/mock-data";
import type { CustomerInvoice, VendorBill } from "@/types";

type Document = VendorBill | CustomerInvoice;

function documentNumber(document: Document): string {
  return "bill_number" in document ? document.bill_number : document.invoice_number;
}

function documentDate(document: Document): string {
  return "bill_date" in document ? document.bill_date : document.invoice_date;
}

/** Shared list for Vendor Bills and Customer Invoices. */
export function BillList({
  title,
  subtitle,
  partnerLabel,
  basePath,
  source,
}: {
  title: string;
  subtitle: string;
  partnerLabel: string;
  basePath: string;
  source: Document[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await mockRequest(source));
    } catch {
      setError("The billing service did not respond.");
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<Document>[] = [
    {
      key: "number",
      header: "Number",
      render: (document) => (
        <span className="tnum font-mono text-[13px] font-medium">{documentNumber(document)}</span>
      ),
    },
    {
      key: "partner",
      header: partnerLabel,
      render: (document) => contactName(document.contact_id),
    },
    { key: "date", header: "Date", render: (document) => formatDate(documentDate(document)) },
    {
      key: "due",
      header: "Due",
      render: (document) => (
        <span className="text-[var(--text-muted)]">{formatDate(document.due_date)}</span>
      ),
    },
    { key: "total", header: "Total", numeric: true, render: (d) => formatMoney(d.total) },
    {
      key: "due_amount",
      header: "Amount due",
      numeric: true,
      render: (document) => formatMoney(document.total - document.amount_paid),
    },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader title={title} subtitle={subtitle} />
      <DataTable
        columns={columns}
        rows={documents}
        rowKey={(document) => documentNumber(document)}
        onRowClick={(document) => router.push(`${basePath}/${document.id}`)}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription="Converting a confirmed order creates one here."
      />
    </div>
  );
}
