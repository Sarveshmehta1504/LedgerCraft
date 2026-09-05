"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, CustomerInvoice, VendorBill } from "@/types";

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
  fetcher,
}: {
  title: string;
  subtitle: string;
  partnerLabel: string;
  basePath: string;
  fetcher: () => Promise<Document[]>;
}) {
  const router = useRouter();
  const { data, loading, error, retry } = useAsyncData<Document[]>(
    fetcher,
    "The billing service did not respond.",
  );
  const documents = data ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

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
        onRetry={retry}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription="Converting a confirmed order creates one here."
      />
    </div>
  );
}
