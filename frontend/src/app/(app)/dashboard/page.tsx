"use client";

import { ArrowUpRight, Banknote, Landmark, Plus, Receipt, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import type {
  AgingSide,
  Contact,
  CustomerInvoice,
  DashboardSummary,
  VendorBill,
} from "@/types";

/**
 * The accounting overview, built the way an ERP builds one: a card per journal,
 * each showing what that journal owes the business or the business owes, what is
 * late, and the one action you take from it.
 *
 * Cards are the right container here, unusually. Each journal is a separate
 * workspace with its own balance and its own primary action, so the elevation is
 * doing real work — this is not decoration around a number.
 */
interface JournalCardProps {
  name: string;
  kind: string;
  icon: LucideIcon;
  balanceLabel: string;
  balance: number;
  rows: { label: string; value: string; href?: string; tone?: "danger" }[];
  /** Every card carries one, so the four share an anatomy and their rows line up. */
  action: { label: string; href: string; kind: "create" | "open" };
  aging?: AgingSide;
}

const BUCKETS = [
  { key: "current", label: "Not due", tint: "var(--accent)" },
  { key: "d1_30", label: "1–30", tint: "#5eead4" },
  { key: "d31_60", label: "31–60", tint: "#fbbf24" },
  { key: "d61_90", label: "61–90", tint: "#f97316" },
  { key: "d90_plus", label: "90+", tint: "var(--danger)" },
] as const;

/** Age of the outstanding balance as one stacked rule — the ERP staple. */
function AgingBar({ side }: { side: AgingSide }) {
  if (side.total <= 0) return null;
  return (
    <div
      className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]"
      role="img"
      aria-label="Outstanding balance by age"
    >
      {BUCKETS.map((bucket) => {
        const value = side.buckets[bucket.key];
        if (value <= 0) return null;
        return (
          <span
            key={bucket.key}
            title={`${bucket.label}: ${formatMoney(value)}`}
            style={{ width: `${(value / side.total) * 100}%`, background: bucket.tint }}
            className="h-full transition-[width] duration-500 ease-out"
          />
        );
      })}
    </div>
  );
}

function JournalCard({
  name,
  kind,
  icon: Icon,
  balanceLabel,
  balance,
  rows,
  action,
  aging,
}: JournalCardProps) {
  return (
    <article className="flex flex-col rounded-lg border border-[var(--line)] bg-white">
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface-sunken)] text-[var(--text-muted)]">
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-[var(--text)]">{name}</h2>
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">{kind}</p>
        </div>
      </header>

      <div className="px-4 pb-3 pt-3.5">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
          {balanceLabel}
        </p>
        <p className="tnum mt-1 font-mono text-[22px] font-medium leading-none tracking-tight text-[var(--text)]">
          {formatMoney(balance)}
        </p>
        {aging && <AgingBar side={aging} />}
      </div>

      <dl className="mt-auto divide-y divide-[var(--line)] border-t border-[var(--line)] text-[13px]">
        {rows.map((row) => {
          const body = (
            <>
              <dt
                className={
                  row.tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text-muted)]"
                }
              >
                {row.label}
              </dt>
              <dd
                className={`tnum font-mono ${
                  row.tone === "danger" ? "text-[var(--danger)]" : "text-[var(--text)]"
                }`}
              >
                {row.value}
              </dd>
            </>
          );
          return row.href ? (
            <Link
              key={row.label}
              href={row.href}
              className="flex items-baseline justify-between gap-3 px-4 py-2 transition-colors duration-150 hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
            >
              {body}
            </Link>
          ) : (
            <div key={row.label} className="flex items-baseline justify-between gap-3 px-4 py-2">
              {body}
            </div>
          );
        })}
      </dl>

      <footer className="border-t border-[var(--line)] bg-[var(--surface-sunken)] px-4 py-2.5">
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--line-strong)] bg-white px-2 py-1 text-[12px] font-medium text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--text-subtle)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-[0.5px]"
        >
          {action.kind === "create" ? (
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
          ) : (
            <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
          )}
          {action.label}
        </Link>
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-3.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The bucket table under a stacked bar — the numbers behind the proportions. */
function AgingBreakdown({ label, side, href }: { label: string; side: AgingSide; href: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Link
          href={href}
          className="text-[13px] text-[var(--text)] underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {label}
        </Link>
        <span className="tnum font-mono text-[13px] font-medium">{formatMoney(side.total)}</span>
      </div>
      <AgingBar side={side} />
      <dl className="mt-2.5 grid grid-cols-5 gap-2">
        {BUCKETS.map((bucket) => (
          <div key={bucket.key}>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: bucket.tint }}
              />
              {bucket.label}
            </dt>
            <dd className="tnum mt-0.5 font-mono text-[12px] text-[var(--text-muted)]">
              {formatMoney(side.buckets[bucket.key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="h-9 w-52 rounded bg-[var(--surface-raised)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-lg bg-[var(--surface-raised)]" />
        ))}
      </div>
      <div className="h-40 rounded bg-[var(--surface-raised)]" />
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

  const fetchAging = useCallback(() => ReportsApi.aging(), []);
  const { data: aging } = useAsyncData(fetchAging, "Could not load the ageing report.");

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

  // "Recent" means the latest handful by definition; the full lists page properly.
  const recentVisible = recent.slice(0, 8);

  if (loading && !summary) return <DashboardSkeleton />;
  if (error && !summary) return <ErrorState message={error} onRetry={retry} />;
  if (!summary) return <ErrorState message="No figures to show yet." onRetry={retry} />;

  const paidInvoices = (invoicesData ?? []).filter((i) => i.status === "paid").length;
  const paidBills = (billsData ?? []).filter((b) => b.status === "paid").length;
  const topRevenue = summary.top_customers[0]?.revenue ?? 0;
  const turnover = Math.max(summary.total_income, summary.total_expenses, 1);
  const liquid = summary.cash + summary.bank;
  const cashShare = liquid > 0 ? Math.round((summary.cash / liquid) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)]">Accounting</h1>
        <p className="text-[13px] text-[var(--text-muted)]">
          Urban Furniture · financial year 2026
          {aging ? ` · as of ${formatDate(aging.as_of)}` : ""}
        </p>
      </div>

      {/* One card per journal, exactly as an accounting overview is organised. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <JournalCard
          name="Customer Invoices"
          kind="Sales journal"
          icon={Receipt}
          balanceLabel="Owed to you"
          balance={summary.total_receivable}
          aging={aging?.receivable}
          rows={[
            {
              label: `${summary.counts.customer_invoices_unpaid} to collect`,
              value: formatMoney(summary.total_receivable),
              href: "/invoices",
            },
            {
              label: "Overdue",
              value: formatMoney(summary.overdue_receivable),
              href: "/invoices",
              tone: "danger",
            },
            { label: `${paidInvoices} settled`, value: "Paid", href: "/invoices" },
          ]}
          action={{ label: "New sales order", href: "/sales/new", kind: "create" }}
        />

        <JournalCard
          name="Vendor Bills"
          kind="Purchase journal"
          icon={ShoppingCart}
          balanceLabel="You owe"
          balance={summary.total_payable}
          aging={aging?.payable}
          rows={[
            {
              label: `${summary.counts.vendor_bills_unpaid} to pay`,
              value: formatMoney(summary.total_payable),
              href: "/bills",
            },
            {
              label: "Overdue",
              value: formatMoney(summary.overdue_payable),
              href: "/bills",
              tone: "danger",
            },
            { label: `${paidBills} settled`, value: "Paid", href: "/bills" },
          ]}
          action={{ label: "New purchase order", href: "/purchases/new", kind: "create" }}
        />

        <JournalCard
          name="Bank Journal"
          kind="Bank"
          icon={Landmark}
          balanceLabel="Balance"
          balance={summary.bank}
          rows={[
            { label: "Cash and bank", value: formatMoney(summary.cash + summary.bank) },
            { label: "Customer receipts", value: "View", href: "/receipts" },
            { label: "Vendor payments", value: "View", href: "/payments" },
          ]}
          action={{ label: "Open ledger", href: "/journal-entries", kind: "open" }}
        />

        <JournalCard
          name="Cash Journal"
          kind="Cash"
          icon={Banknote}
          balanceLabel="Balance"
          balance={summary.cash}
          rows={[
            { label: "Share of liquid funds", value: `${cashShare}%` },
            { label: "Chart of accounts", value: "View", href: "/accounts" },
            { label: "Journals", value: "View", href: "/journals" },
          ]}
          action={{ label: "Open chart of accounts", href: "/accounts", kind: "open" }}
        />
      </div>

      {aging && (
        <Section title="Ageing">
          <div className="mt-3.5 grid gap-6 lg:grid-cols-2">
            <AgingBreakdown label="Receivable" side={aging.receivable} href="/invoices" />
            <AgingBreakdown label="Payable" side={aging.payable} href="/bills" />
          </div>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Section title="Profit and loss">
          <div className="mt-3">
            <p className="text-xs text-[var(--text-subtle)]">
              {summary.net_income >= 0 ? "Profit so far" : "Loss so far"}
            </p>
            <p
              className={`tnum mt-1 font-mono text-[26px] font-medium leading-none tracking-tight ${
                summary.net_income >= 0 ? "text-[var(--status-paid)]" : "text-[var(--danger)]"
              }`}
            >
              {formatMoney(Math.abs(summary.net_income))}
            </p>

            <dl className="mt-4 flex flex-col gap-2.5">
              {[
                { label: "Income", value: summary.total_income, tint: "var(--accent)" },
                { label: "Expenses", value: summary.total_expenses, tint: "var(--text-subtle)" },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between text-[13px]">
                    <dt className="text-[var(--text-muted)]">{row.label}</dt>
                    <dd className="tnum font-mono">{formatMoney(row.value)}</dd>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{ width: `${(row.value / turnover) * 100}%`, background: row.tint }}
                    />
                  </div>
                </div>
              ))}
            </dl>

            <Link
              href="/reports/profit-and-loss"
              className="mt-3 inline-block text-[12px] text-[var(--accent)] underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Open the P&amp;L report
            </Link>
          </div>
        </Section>

        <Section title="Top customers by revenue">
          {summary.top_customers.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--text-subtle)]">
              No revenue posted yet. Confirm a sales order and invoice it to see customers here.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2.5">
              {summary.top_customers.map((customer, index) => (
                <li key={customer.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="tnum w-4 shrink-0 font-mono text-[11px] text-[var(--text-subtle)]">
                        {index + 1}
                      </span>
                      <span className="truncate text-[var(--text)]">{customer.name}</span>
                    </span>
                    <span className="tnum shrink-0 font-mono text-[var(--text-muted)]">
                      {formatMoney(customer.revenue)}
                    </span>
                  </div>
                  <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-[var(--surface-raised)]">
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
      </div>

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
        )}
      </Section>
    </div>
  );
}
