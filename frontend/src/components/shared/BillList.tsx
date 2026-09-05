"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
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

/** The counterparty's own document number, entered by hand on the form. */
function documentReference(document: Document): string | null {
  return "bill_reference" in document ? document.bill_reference : document.invoice_reference;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "paid", label: "Paid" },
];

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, loading, error, retry } = useAsyncData<Document[]>(
    fetcher,
    "The billing service did not respond.",
  );
  const documents = data ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  const term = search.trim().toLowerCase();
  const visible = documents.filter((document) => {
    const matchesStatus = !statusFilter || document.status === statusFilter;
    // The counterparty's reference is searchable too: it is the number they
    // quote when they ring up about a document, and the only one they know.
    const matchesSearch =
      !term ||
      documentNumber(document).toLowerCase().includes(term) ||
      contactName(document.contact_id).toLowerCase().includes(term) ||
      (documentReference(document) ?? "").toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const filtered = Boolean(term || statusFilter);

  const columns: Column<Document>[] = [
    {
      key: "number",
      header: "Number",
      render: (document) => (
        <span className="tnum font-mono text-[13px] font-medium">{documentNumber(document)}</span>
      ),
      sortValue: (document) => documentNumber(document),
    },
    {
      key: "partner",
      header: partnerLabel,
      render: (document) => contactName(document.contact_id),
      sortValue: (document) => contactName(document.contact_id),
    },
    {
      key: "date",
      header: "Date",
      render: (document) => formatDate(documentDate(document)),
      sortValue: (document) => documentDate(document),
    },
    {
      key: "due",
      header: "Due",
      render: (document) => (
        <span className="text-[var(--text-muted)]">{formatDate(document.due_date)}</span>
      ),
      // Sorting ascending puts the oldest due date first, which is the order
      // you chase payments in.
      sortValue: (document) => document.due_date,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (d) => formatMoney(d.total),
      sortValue: (d) => d.total,
    },
    {
      key: "due_amount",
      header: "Amount due",
      numeric: true,
      render: (document) => formatMoney(document.total - document.amount_paid),
      sortValue: (document) => document.total - document.amount_paid,
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge status={d.status} />,
      sortValue: (d) => d.status,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader title={title} subtitle={subtitle} />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search number, reference or ${partnerLabel.toLowerCase()}`}
          label={`Search ${title.toLowerCase()}`}
          width="w-72"
        />
        <SegmentedFilter
          value={statusFilter}
          options={STATUS_FILTERS}
          onChange={setStatusFilter}
          label="Filter by status"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(document) => documentNumber(document)}
        onRowClick={(document) => router.push(`${basePath}/${document.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={filtered ? "Nothing matches" : `No ${title.toLowerCase()} yet`}
        emptyDescription={
          filtered
            ? "Try a different search term or status."
            : "Converting a confirmed order creates one here."
        }
      />
    </div>
  );
}
