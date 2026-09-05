"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { PortalApi } from "@/lib/resources";
import { getCurrentUser } from "@/lib/session";
import { useAsyncData } from "@/lib/use-async-data";
import type { CustomerInvoice } from "@/types";

/**
 * The customer's own view. A `user` account is scoped to its linked contact on
 * the server, so this reads /my/invoices — every back-office route answers 403
 * for this role, which is why the portal has a screen of its own rather than
 * sharing the dashboard.
 */
/**
 * "Outstanding" is the useful cut here rather than the raw status: a customer
 * wants the two invoices they still owe on, not the difference between posted
 * and partly paid.
 */
const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "paid", label: "Paid" },
];

export default function PortalPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const user = typeof window === "undefined" ? null : getCurrentUser();
  // /my/invoices is scoped to the caller's own contact, so it answers 403 for
  // staff accounts. Say that plainly instead of showing a failed request.
  const isPortalAccount = user?.role === "user";

  const fetchInvoices = useCallback(() => PortalApi.invoices(), []);
  const { data, loading, error, retry } = useAsyncData<CustomerInvoice[]>(
    fetchInvoices,
    "Could not load your invoices.",
  );
  const invoices = data ?? [];

  // Deliberately computed over every invoice, not the filtered view: the tiles
  // are the state of the account, and would be wrong if a filter moved them.
  const outstanding = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + (invoice.total - invoice.amount_paid), 0);

  const term = search.trim().toLowerCase();
  const visible = invoices.filter((invoice) => {
    const matchesSearch =
      !term ||
      invoice.invoice_number.toLowerCase().includes(term) ||
      (invoice.invoice_reference ?? "").toLowerCase().includes(term);
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "paid" ? invoice.status === "paid" : invoice.status !== "paid");
    return matchesSearch && matchesStatus;
  });

  const filtered = Boolean(term || statusFilter);

  const columns: Column<CustomerInvoice>[] = [
    {
      key: "invoice_number",
      header: "Invoice",
      render: (invoice) => (
        <span className="tnum font-mono text-[13px] font-medium">{invoice.invoice_number}</span>
      ),
      sortValue: (invoice) => invoice.invoice_number,
    },
    {
      key: "invoice_date",
      header: "Date",
      render: (invoice) => formatDate(invoice.invoice_date),
      sortValue: (invoice) => invoice.invoice_date,
    },
    {
      key: "due_date",
      header: "Due",
      render: (invoice) => (
        <span className="text-[var(--text-muted)]">
          {invoice.due_date ? formatDate(invoice.due_date) : "—"}
        </span>
      ),
      sortValue: (invoice) => invoice.due_date,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (invoice) => formatMoney(invoice.total),
      sortValue: (invoice) => invoice.total,
    },
    {
      key: "amount_paid",
      header: "Paid",
      numeric: true,
      render: (invoice) => formatMoney(invoice.amount_paid),
      sortValue: (invoice) => invoice.amount_paid,
    },
    {
      key: "due",
      header: "Due amount",
      numeric: true,
      render: (invoice) => formatMoney(invoice.total - invoice.amount_paid),
      sortValue: (invoice) => invoice.total - invoice.amount_paid,
    },
    {
      key: "status",
      header: "Status",
      render: (invoice) => <StatusBadge status={invoice.status} />,
      sortValue: (invoice) => invoice.status,
    },
  ];

  if (user && !isPortalAccount) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader
          title="Customer portal"
          subtitle="What a customer sees when they sign in"
        />
        <EmptyState
          title="Only a portal account has a portal"
          description="This view lists the invoices of the contact a portal account is linked to, so a staff account has nothing to show here. Create a portal user under Account → Users and link it to a contact, then sign in as that user to see it."
          action={
            <Link href="/users/new">
              <Button variant="primary" size="sm">
                New portal user
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader
          title={user ? `Welcome, ${user.name}` : "Your account"}
          subtitle="Your invoices with Urban Furniture"
        />
        <dl className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
          {[
            { label: "Invoices", value: String(invoices.length) },
            {
              label: "Paid",
              value: String(invoices.filter((invoice) => invoice.status === "paid").length),
            },
            { label: "Outstanding", value: formatMoney(outstanding) },
          ].map((cell) => (
            <div key={cell.label} className="bg-white px-5 py-3.5">
              <dt className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                {cell.label}
              </dt>
              <dd className="tnum mt-1 font-mono text-lg text-[var(--text)]">{cell.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader title="Invoices" subtitle="Everything billed to your account" />

        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoice or reference"
            label="Search your invoices"
          />
          <SegmentedFilter
            value={statusFilter}
            options={STATUS_FILTERS}
            onChange={setStatusFilter}
            label="Filter by settlement"
          />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(invoice) => invoice.id}
          onRowClick={(invoice) => router.push(`/portal/invoices/${invoice.id}`)}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={filtered ? "Nothing matches" : "No invoices yet"}
          emptyDescription={
            filtered
              ? "Try a different search term, or show all invoices."
              : "Invoices raised against your account will appear here."
          }
        />
      </div>
    </div>
  );
}
