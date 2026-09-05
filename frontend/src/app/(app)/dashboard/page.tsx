"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import {
  MOCK_CUSTOMER_INVOICES,
  MOCK_PURCHASE_ORDERS,
  MOCK_SALES_ORDERS,
  MOCK_VENDOR_BILLS,
  contactName,
} from "@/lib/mock-data";

// TODO: replace with real API once backend/reports is ready (GET /api/reports/dashboard).
// Counts are derived from the placeholder collections so they stay self-consistent.
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
  const recent = [
    ...MOCK_CUSTOMER_INVOICES.map((invoice) => ({
      id: `inv-${invoice.id}`,
      number: invoice.invoice_number,
      party: contactName(invoice.contact_id),
      date: invoice.invoice_date,
      total: invoice.total,
      status: invoice.status,
      href: `/invoices/${invoice.id}`,
    })),
    ...MOCK_VENDOR_BILLS.map((bill) => ({
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
            { label: "All", value: String(MOCK_SALES_ORDERS.length) },
            { label: "Confirmed", value: String(countBy(MOCK_SALES_ORDERS, "confirmed")) },
            { label: "Draft", value: String(countBy(MOCK_SALES_ORDERS, "draft")) },
          ]}
        />
        <Panel
          title="Purchase"
          action={{ label: "New", href: "/purchases/new" }}
          metrics={[
            { label: "All", value: String(MOCK_PURCHASE_ORDERS.length) },
            { label: "Confirmed", value: String(countBy(MOCK_PURCHASE_ORDERS, "confirmed")) },
            { label: "Draft", value: String(countBy(MOCK_PURCHASE_ORDERS, "draft")) },
          ]}
        />
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
              <Link
                href={row.href}
                className="flex items-center justify-between gap-4 py-2.5 transition-colors duration-150 hover:bg-white"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tnum font-mono text-[13px] text-[var(--text)]">{row.number}</span>
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
