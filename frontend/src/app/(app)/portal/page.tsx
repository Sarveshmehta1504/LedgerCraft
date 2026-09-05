"use client";

import { useCallback } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
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
export default function PortalPage() {
  const user = typeof window === "undefined" ? null : getCurrentUser();

  const fetchInvoices = useCallback(() => PortalApi.invoices(), []);
  const { data, loading, error, retry } = useAsyncData<CustomerInvoice[]>(
    fetchInvoices,
    "Could not load your invoices.",
  );
  const invoices = data ?? [];

  const outstanding = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + (invoice.total - invoice.amount_paid), 0);

  const columns: Column<CustomerInvoice>[] = [
    {
      key: "invoice_number",
      header: "Invoice",
      render: (invoice) => (
        <span className="tnum font-mono text-[13px] font-medium">{invoice.invoice_number}</span>
      ),
    },
    { key: "invoice_date", header: "Date", render: (invoice) => formatDate(invoice.invoice_date) },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (invoice) => formatMoney(invoice.total),
    },
    {
      key: "amount_paid",
      header: "Paid",
      numeric: true,
      render: (invoice) => formatMoney(invoice.amount_paid),
    },
    {
      key: "due",
      header: "Due",
      numeric: true,
      render: (invoice) => formatMoney(invoice.total - invoice.amount_paid),
    },
    {
      key: "status",
      header: "Status",
      render: (invoice) => <StatusBadge status={invoice.status} />,
    },
  ];

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
        <DataTable
          columns={columns}
          rows={invoices}
          rowKey={(invoice) => invoice.id}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle="No invoices yet"
          emptyDescription="Invoices raised against your account will appear here."
        />
      </div>
    </div>
  );
}
