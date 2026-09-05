"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { BudgetsApi, ContactsApi, CustomerInvoicesApi, PurchaseOrdersApi, SalesOrdersApi, VendorBillsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Budget, Contact, CustomerInvoice, PurchaseOrder, SalesOrder, VendorBill } from "@/types";

function countBy<T extends { status: string }>(rows: T[], status: string) {
  return rows.filter((row) => row.status === status).length;
}

/**
 * One module's summary: a headline count with its supporting splits beside it.
 *
 * Three equal 2xl numbers read as three equally important facts, which they are
 * not — "how many are there" is the question, and confirmed/draft only qualify
 * it. The action is a quiet outlined control rather than a solid black pill:
 * on a summary screen the figures are the content, and a filled button beside
 * a label out-shouts every number on the row.
 */
function Panel({
  title,
  action,
  primary,
  splits,
}: {
  title: string;
  action: { label: string; href: string; kind: "create" | "open" };
  primary: { label: string; value: string };
  splits: { label: string; value: string }[];
}) {
  const ActionIcon = action.kind === "create" ? Plus : ArrowUpRight;

  return (
    <section className="border-t border-[var(--line)] pt-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          {title}
        </h2>
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--line-strong)] bg-white px-2 py-1 text-[12px] font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--text-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-[0.5px]"
        >
          <ActionIcon size={12} strokeWidth={2} aria-hidden="true" />
          {action.label}
        </Link>
      </div>

      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <p className="tnum font-mono text-[32px] font-medium leading-none tracking-tight text-[var(--text)]">
            {primary.value}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-subtle)]">{primary.label}</p>
        </div>
        <dl className="flex gap-5 pb-1">
          {splits.map((split) => (
            <div key={split.label} className="text-right">
              <dd className="tnum font-mono text-[15px] font-medium leading-none text-[var(--text-muted)]">
                {split.value}
              </dd>
              <dt className="mt-1.5 text-[11px] text-[var(--text-subtle)]">{split.label}</dt>
            </div>
          ))}
        </dl>
      </div>
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

  const fetchBudgets = useCallback(() => BudgetsApi.list(), []);
  const { data: budgetsData } = useAsyncData<Budget[]>(fetchBudgets, "Could not load budgets.");
  const budgets = budgetsData ?? [];

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

  // Capped rather than paged. "Recent" means the latest handful by definition,
  // and a pager on a dashboard summary invites someone to read the whole ledger
  // from a panel that was never meant to hold it — the full lists are one click
  // away and page properly.
  const RECENT_LIMIT = 10;
  const recentVisible = recent.slice(0, RECENT_LIMIT);

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
          action={{ label: "New order", href: "/sales/new", kind: "create" }}
          primary={{ label: "Sales orders", value: String(salesOrders.length) }}
          splits={[
            { label: "Confirmed", value: String(countBy(salesOrders, "confirmed")) },
            { label: "Draft", value: String(countBy(salesOrders, "draft")) },
          ]}
        />
        <Panel
          title="Purchase"
          action={{ label: "New order", href: "/purchases/new", kind: "create" }}
          primary={{ label: "Purchase orders", value: String(purchaseOrders.length) }}
          splits={[
            { label: "Confirmed", value: String(countBy(purchaseOrders, "confirmed")) },
            { label: "Draft", value: String(countBy(purchaseOrders, "draft")) },
          ]}
        />
        <Panel
          title="Budgets"
          action={{ label: "Open report", href: "/reports/budget", kind: "open" }}
          primary={{ label: "Budgets", value: String(budgets.length) }}
          splits={[
            {
              label: "Confirmed",
              value: String(budgets.filter((budget) => budget.status === "confirmed").length),
            },
            {
              label: "Achieving",
              value: String(budgets.filter((budget) => budget.actual_amount > 0).length),
            },
          ]}
        />
      </div>

      <section className="border-t border-[var(--line)] pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Recent transactions
          </h2>
          {recent.length > RECENT_LIMIT && (
            <p className="text-[13px] text-[var(--text-subtle)]">
              Latest {RECENT_LIMIT} of {recent.length} —{" "}
              <Link
                href="/invoices"
                className="text-[var(--accent)] underline decoration-dotted underline-offset-4"
              >
                invoices
              </Link>{" "}
              ·{" "}
              <Link
                href="/bills"
                className="text-[var(--accent)] underline decoration-dotted underline-offset-4"
              >
                bills
              </Link>
            </p>
          )}
        </div>
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {recentVisible.map((row) => (
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
