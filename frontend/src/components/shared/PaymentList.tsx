"use client";

import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput } from "@/components/shared/FilterBar";
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
  const [search, setSearch] = useState("");

  const derivedFetcher = useCallback(() => fetcher().then(derivePayments), [fetcher]);
  const { data, loading, error, retry } = useAsyncData<PaymentRow[]>(
    derivedFetcher,
    "The payments service did not respond.",
  );
  const rows = data ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  // No status or method filter here: every row is a settled amount by
  // definition, and `via` is a placeholder until there is a payments endpoint
  // to read it from. Filtering on a hardcoded value would be a lie.
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      !term ||
      row.document.toLowerCase().includes(term) ||
      contactName(row.contact_id).toLowerCase().includes(term),
  );

  const columns: Column<PaymentRow>[] = [
    {
      key: "document",
      header: "Document",
      render: (row) => <span className="tnum font-mono text-[13px] font-medium">{row.document}</span>,
      sortValue: (row) => row.document,
    },
    {
      key: "partner",
      header: partnerLabel,
      render: (row) => contactName(row.contact_id),
      sortValue: (row) => contactName(row.contact_id),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => formatDate(row.date),
      sortValue: (row) => row.date,
    },
    { key: "via", header: "Via", render: (row) => titleCase(row.via) },
    {
      key: "amount",
      header: "Amount",
      numeric: true,
      render: (row) => formatMoney(row.amount),
      sortValue: (row) => row.amount,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader title={title} subtitle={subtitle} />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search document or ${partnerLabel.toLowerCase()}`}
          label={`Search ${title.toLowerCase()}`}
          width="w-72"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={term ? "Nothing matches" : `No ${title.toLowerCase()} yet`}
        emptyDescription={
          term
            ? "Try a different document number or name."
            : "Registering a payment against a posted document records it here."
        }
      />
    </div>
  );
}
