"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorState } from "@/components/ui/States";
import { formatDate, formatMoney } from "@/lib/format";
import {
  ContactsApi,
  CustomerInvoicesApi,
  ReportsApi,
  VendorBillsApi,
} from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, CustomerInvoice, DashboardSummary, VendorBill } from "@/types";

/** Section rule. Grouping by a line and a label, not by boxing everything in a card. */
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string; kind: "create" | "open" };
  children: React.ReactNode;
}) {
  const ActionIcon = action?.kind === "create" ? Plus : ArrowUpRight;
  return (
    <section className="border-t border-[var(--line)] pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--line-strong)] bg-white px-2 py-1 text-[12px] font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--text-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-[0.5px]"
          >
            <ActionIcon size={12} strokeWidth={2} aria-hidden="true" />
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * How much of a balance is already overdue, as a proportion.
 *
 * A bar rather than a second number: "₹1,00,278 of ₹1,56,176" needs arithmetic
 * to interpret, where a filled proportion is read at a glance — and overdue
 * against total is genuinely a share of a whole.
 */
function OverdueBar({ total, overdue }: { total: number; overdue: number }) {
  const ratio = total > 0 ? Math.min(overdue / total, 1) : 0;
  return (
    <div className="mt-2.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
        <div
          className="h-full rounded-full bg-[var(--danger)] transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
        <span className="tnum font-mono text-[var(--danger)]">{formatMoney(overdue)}</span> overdue
      </p>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "default",
  size = "lg",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  size?: "lg" | "sm";
}) {
  const colour =
    tone === "positive"
      ? "text-[var(--status-paid)]"
      : tone === "negative"
        ? "text-[var(--danger)]"
        : "text-[var(--text)]";
  return (
    <div>
      <p className="text-xs text-[var(--text-subtle)]">{label}</p>
      <p
        className={`tnum mt-1 font-mono font-medium tracking-tight ${colour} ${
          size === "lg" ? "text-[30px] leading-none" : "text-[17px] leading-none"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-7" aria-busy="true">
      <div className="h-9 w-52 rounded bg-[var(--surface-raised)]" />
      <div className="grid gap-7 lg:grid-cols-[2fr_1fr]">
        <div className="h-28 rounded bg-[var(--surface-raised)]" />
        <div className="h-28 rounded bg-[var(--surface-raised)]" />
      </div>
      <div className="grid gap-7 sm:grid-cols-2">
        <div className="h-24 rounded bg-[var(--surface-raised)]" />
        <div className="h-24 rounded bg-[var(--surface-raised)]" />
      </div>
      <div className="h-48 rounded bg-[var(--surface-raised)]" />
    </div>
  );
}

export default function DashboardPage() {
  const fetchSummary = useCallback(() => ReportsApi.dashboard(), []);
  const {
    data: summary,
    loading,
    error,
    retry,
  } = useAsyncData<DashboardSummary>(fetchSummary, "The reporting service did not respond.");

  // The recent list is the one thing the summary endpoint does not carry, so the
  // two document lists are read alongside it rather than recomputing totals here.
  const fetchInvoices = useCallback(() => CustomerInvoicesApi.list(), []);
  const { data: invoicesData } = useAsyncData<CustomerInvoice[]>(
    fetchInvoices,
    "Could not load invoices.",
  );
  const fetchBills = useCallback(() => VendorBillsApi.list(), []);
  const { data: billsData } = useAsyncData<VendorBill[]>(fetchBills, "Could not load bills.");
  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");

  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  const recent = [
    ...(invoicesData ?? []).map((invoice) => ({
      id: `inv-${invoice.id}`,
      number: invoice.invoice_number,
      party: contactName(invoice.contact_id),
      date: invoice.invoice_date,
      total: invoice.total,
      status: invoice.status,
      href: `/invoices/${invoice.id}`,
    })),
    ...(billsData ?? []).map((bill) => ({
      id: `bill-${bill.id}`,
      number: bill.bill_number,
      party: contactName(bill.contact_id),
      date: bill.bill_date,
      total: bill.total,
      status: bill.status,
      href: `/bills/${bill.id}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Capped rather than paged. "Recent" means the latest handful by definition,
  // and a pager here invites reading the whole ledger from a summary panel.
  const RECENT_LIMIT = 8;
  const recentVisible = recent.slice(0, RECENT_LIMIT);

  if (loading && !summary) return <DashboardSkeleton />;
  if (error && !summary) return <ErrorState message={error} onRetry={retry} />;
  if (!summary) return <ErrorState message="No figures to show yet." onRetry={retry} />;

  const liquid = summary.cash + summary.bank;
  const topRevenue = summary.top_customers[0]?.revenue ?? 0;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Dashboard</h1>
        <p className="text-[13px] text-[var(--text-muted)]">
          Urban Furniture · financial year 2026
        </p>
      </div>

      {/* Money on hand leads, and takes the wider track: it is the number a
          business checks first, and the income split only qualifies it. */}
      <div className="grid gap-7 lg:grid-cols-[2fr_1fr]">
        <Section title="Cash position">
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <Figure label="Cash and bank" value={formatMoney(liquid)} />
            <dl className="flex gap-6 pb-1">
              <div>
                <dt className="text-[11px] text-[var(--text-subtle)]">Bank</dt>
                <dd className="tnum mt-1 font-mono text-[15px] leading-none text-[var(--text-muted)]">
                  {formatMoney(summary.bank)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--text-subtle)]">Cash</dt>
                <dd className="tnum mt-1 font-mono text-[15px] leading-none text-[var(--text-muted)]">
                  {formatMoney(summary.cash)}
                </dd>
              </div>
            </dl>
          </div>
        </Section>

        <Section title="Net income" action={{ label: "P&L", href: "/reports/profit-and-loss", kind: "open" }}>
          <div className="mt-3">
            <Figure
              label={summary.net_income >= 0 ? "Profit so far" : "Loss so far"}
              value={formatMoney(Math.abs(summary.net_income))}
              tone={summary.net_income >= 0 ? "positive" : "negative"}
            />
            <p className="mt-2.5 text-[12px] text-[var(--text-muted)]">
              <span className="tnum font-mono">{formatMoney(summary.total_income)}</span> in ·{" "}
              <span className="tnum font-mono">{formatMoney(summary.total_expenses)}</span> out
            </p>
          </div>
        </Section>
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <Section
          title="Receivable"
          action={{ label: "Invoices", href: "/invoices", kind: "open" }}
        >
          <div className="mt-3">
            <Figure label="Owed to you" value={formatMoney(summary.total_receivable)} size="sm" />
            <OverdueBar total={summary.total_receivable} overdue={summary.overdue_receivable} />
            <p className="mt-1 text-[12px] text-[var(--text-subtle)]">
              {summary.counts.customer_invoices_unpaid} unpaid invoice
              {summary.counts.customer_invoices_unpaid === 1 ? "" : "s"}
            </p>
          </div>
        </Section>

        <Section title="Payable" action={{ label: "Bills", href: "/bills", kind: "open" }}>
          <div className="mt-3">
            <Figure label="You owe" value={formatMoney(summary.total_payable)} size="sm" />
            <OverdueBar total={summary.total_payable} overdue={summary.overdue_payable} />
            <p className="mt-1 text-[12px] text-[var(--text-subtle)]">
              {summary.counts.vendor_bills_unpaid} unpaid bill
              {summary.counts.vendor_bills_unpaid === 1 ? "" : "s"}
            </p>
          </div>
        </Section>
      </div>

      <div className="grid gap-7 lg:grid-cols-[1fr_1.4fr]">
        <Section title="Top customers by revenue">
          {summary.top_customers.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--text-subtle)]">
              No revenue posted yet. Confirm a sales order and invoice it to see customers here.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2.5">
              {summary.top_customers.map((customer) => (
                <li key={customer.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate text-[var(--text)]">{customer.name}</span>
                    <span className="tnum shrink-0 font-mono text-[var(--text-muted)]">
                      {formatMoney(customer.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                      style={{
                        width: `${topRevenue > 0 ? (customer.revenue / topRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Recent transactions">
          {recentVisible.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--text-subtle)]">
              Nothing posted yet. A confirmed invoice or bill lands here as soon as it is posted.
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-[var(--line)]">
              {recentVisible.map((row) => (
                <li key={row.id}>
                  {/* Stacks below sm — five columns on a 375px row collide. */}
                  <Link
                    href={row.href}
                    className="flex flex-col gap-1 py-2.5 transition-colors duration-150 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="tnum shrink-0 font-mono text-[13px] text-[var(--text)]">
                        {row.number}
                      </span>
                      <span className="truncate text-[13px] text-[var(--text-muted)]">
                        {row.party}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="text-xs text-[var(--text-subtle)]">
                        {formatDate(row.date)}
                      </span>
                      <span className="tnum font-mono text-[13px] text-[var(--text)]">
                        {formatMoney(row.total)}
                      </span>
                      <StatusBadge status={row.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Counts are navigation, not headline figures, so they sit last and quiet. */}
      <Section title="Records">
        <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: "Sales orders", value: summary.counts.sales_orders, href: "/sales" },
            { label: "Purchase orders", value: summary.counts.purchase_orders, href: "/purchases" },
            { label: "Contacts", value: summary.counts.contacts, href: "/contacts" },
            { label: "Products", value: summary.counts.products, href: "/products" },
          ].map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="group flex items-baseline gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span className="tnum font-mono text-[17px] font-medium leading-none text-[var(--text)]">
                  {item.value}
                </span>
                <span className="text-[12px] text-[var(--text-muted)] transition-colors duration-150 group-hover:text-[var(--text)]">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
