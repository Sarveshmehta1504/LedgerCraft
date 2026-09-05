"use client";

import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { PortalTabs } from "@/components/shared/PortalTabs";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { PortalApi } from "@/lib/resources";
import { getCurrentUser } from "@/lib/session";
import { useAsyncData } from "@/lib/use-async-data";
import type { VendorBill } from "@/types";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "paid", label: "Paid" },
];

/**
 * The other half of the portal: what this contact has billed *us*.
 *
 * Only a `both` contact — someone we both sell to and buy from — has anything
 * here, so an empty list is the normal case for a pure customer and is worded
 * as such rather than as a fault. Reads /my/bills, scoped server-side to the
 * signed-in account's contact exactly like /my/invoices.
 */
export default function PortalBillsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const user = typeof window === "undefined" ? null : getCurrentUser();
  const isPortalAccount = user?.role === "user";

  const fetchBills = useCallback(() => PortalApi.bills(), []);
  const { data, loading, error, retry } = useAsyncData<VendorBill[]>(
    fetchBills,
    "Could not load your bills.",
  );
  const bills = data ?? [];

  const term = search.trim().toLowerCase();
  const visible = bills.filter((bill) => {
    const matchesSearch =
      !term ||
      bill.bill_number.toLowerCase().includes(term) ||
      (bill.bill_reference ?? "").toLowerCase().includes(term);
    const matchesStatus =
      !statusFilter || (statusFilter === "paid" ? bill.status === "paid" : bill.status !== "paid");
    return matchesSearch && matchesStatus;
  });

  const filtered = Boolean(term || statusFilter);

  const columns: Column<VendorBill>[] = [
    {
      key: "bill_number",
      header: "Bill",
      render: (bill) => (
        <span className="tnum font-mono text-[13px] font-medium">{bill.bill_number}</span>
      ),
      sortValue: (bill) => bill.bill_number,
    },
    {
      key: "bill_date",
      header: "Date",
      render: (bill) => formatDate(bill.bill_date),
      sortValue: (bill) => bill.bill_date,
    },
    {
      key: "due_date",
      header: "Due",
      render: (bill) => (
        <span className="text-[var(--text-muted)]">
          {bill.due_date ? formatDate(bill.due_date) : "—"}
        </span>
      ),
      sortValue: (bill) => bill.due_date,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (bill) => formatMoney(bill.total),
      sortValue: (bill) => bill.total,
    },
    {
      key: "amount_paid",
      header: "Paid",
      numeric: true,
      render: (bill) => formatMoney(bill.amount_paid),
      sortValue: (bill) => bill.amount_paid,
    },
    {
      key: "due",
      header: "Due amount",
      numeric: true,
      render: (bill) => formatMoney(bill.total - bill.amount_paid),
      sortValue: (bill) => bill.total - bill.amount_paid,
    },
    {
      key: "status",
      header: "Status",
      render: (bill) => <StatusBadge status={bill.status} />,
      sortValue: (bill) => bill.status,
    },
  ];

  if (user && !isPortalAccount) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader title="Customer portal" subtitle="What a customer sees when they sign in" />
        <EmptyState
          title="Only a portal account has a portal"
          description="This view lists the bills raised by the contact a portal account is linked to, so a staff account has nothing to show here."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PortalTabs />

      <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
        <PageHeader title="Bills" subtitle="What you have billed Urban Furniture" />

        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search bill or reference"
            label="Search your bills"
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
          rowKey={(bill) => bill.id}
          loading={loading}
          error={error}
          onRetry={retry}
          emptyTitle={filtered ? "Nothing matches" : "No bills yet"}
          emptyDescription={
            filtered
              ? "Try a different search term, or show all bills."
              : "Bills appear here only if you also supply Urban Furniture. If you are a customer only, this list stays empty."
          }
        />
      </div>
    </div>
  );
}
