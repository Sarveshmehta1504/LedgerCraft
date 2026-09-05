"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import {
  ContactsApi,
  CustomerInvoicesApi,
  PurchaseOrdersApi,
  SalesOrdersApi,
  VendorBillsApi,
} from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, CustomerInvoice, PurchaseOrder, SalesOrder, VendorBill } from "@/types";

function countBy<T extends { status: string }>(rows: T[], status: string) {
  return rows.filter((row) => row.status === status).length;
}

function Panel({
  title,
  action,
  metrics,
}: {
  title: string;
  action: { label: string; href: string };
  metrics: { label: string; value: string }[];
}) {
  return (
    <section className="border-t border-[var(--line)] pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </h2>
        <Link href={action.href}>
          <Button size="sm" variant="primary">
            {action.label}
          </Button>
        </Link>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-x-6">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-xs text-[var(--text-subtle)]">{metric.label}</dt>
            <dd className="tnum mt-0.5 font-mono text-2xl font-medium tracking-tight text-[var(--text)]">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function DashboardPage() {
  const fetchSales = useCallback(() => SalesOrdersApi.list(), []);
  const { data: salesData } = useAsyncData<SalesOrder[]>(fetchSales, "Could not load sales orders.");
  const salesOrders = salesData ?? [];

  const fetchPurchases = useCallback(() => PurchaseOrdersApi.list(), []);
  const { data: purchasesData } = useAsyncData<PurchaseOrder[]>(fetchPurchases, "Could not load purchase orders.");
  const purchaseOrders = purchasesData ?? [];

  const fetchInvoices = useCallback(() => CustomerInvoicesApi.list(), []);
  const { data: invoicesData } = useAsyncData<CustomerInvoice[]>(fetchInvoices, "Could not load invoices.");
  const invoices = invoicesData ?? [];

  const fetchBills = useCallback(() => VendorBillsApi.list(), []);
  const { data: billsData } = useAsyncData<VendorBill[]>(fetchBills, "Could not load bills.");
  const bills = billsData ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  const recent = [
    ...invoices.map((invoice) => ({
      id: `inv-${invoice.id}`,
      number: invoice.invoice_number,
      party: contactName(invoice.contact_id),
      date: invoice.invoice_date,
      total: invoice.total,
      status: invoice.status,
      href: `/invoices/${invoice.id}`,
    })),
    ...bills.map((bill) => ({
      id: `bill-${bill.id}`,
      number: bill.bill_number,
      party: contactName(bill.contact_id),
      date: bill.bill_date,
      total: bill.total,
      status: bill.status,
      href: `/bills/${bill.id}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Dashboard</h1>
        <p className="text-[13px] text-[var(--text-muted)]">
          Urban Furniture · financial year 2026
        </p>
      </div>

      <div className="grid gap-7 lg:grid-cols-3">
        <Panel
          title="Sales"
          action={{ label: "New", href: "/sales/new" }}
          metrics={[
            { label: "All", value: String(salesOrders.length) },
            { label: "Confirmed", value: String(countBy(salesOrders, "confirmed")) },
            { label: "Draft", value: String(countBy(salesOrders, "draft")) },
          ]}
        />
        <Panel
          title="Purchase"
          action={{ label: "New", href: "/purchases/new" }}
          metrics={[
            { label: "All", value: String(purchaseOrders.length) },
            { label: "Confirmed", value: String(countBy(purchaseOrders, "confirmed")) },
            { label: "Draft", value: String(countBy(purchaseOrders, "draft")) },
          ]}
        />
        {/* TODO: replace with real API once backend/budgets exists — there is no budgets route yet. */}
        <Panel
          title="Budget Reports"
          action={{ label: "Report", href: "/reports/budget" }}
          metrics={[
            { label: "Achieved", value: "1" },
            { label: "Budget", value: "3" },
            { label: "Committed", value: "2" },
          ]}
        />
      </div>

      <section className="border-t border-[var(--line)] pt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Recent transactions
        </h2>
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {recent.map((row) => (
            <li key={row.id}>
              {/* Stacks below sm — five columns on a 375px row collide into each other. */}
              <Link
                href={row.href}
                className="flex flex-col gap-1 py-2.5 transition-colors duration-150 hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tnum shrink-0 font-mono text-[13px] text-[var(--text)]">
                    {row.number}
                  </span>
                  <span className="truncate text-[13px] text-[var(--text-muted)]">{row.party}</span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-xs text-[var(--text-subtle)]">{formatDate(row.date)}</span>
                  <span className="tnum font-mono text-[13px] text-[var(--text)]">
                    {formatMoney(row.total)}
                  </span>
                  <StatusBadge status={row.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
