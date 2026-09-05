"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, SearchInput, SegmentedFilter } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact, PurchaseOrder, SalesOrder } from "@/types";

type Order = PurchaseOrder | SalesOrder;

/** Shared list surface for Purchase Orders and Sales Orders — identical shape, different labels. */
export function OrderList({
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
  fetcher: () => Promise<Order[]>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error, retry } = useAsyncData<Order[]>(
    fetcher,
    "The order service did not respond.",
  );
  const orders = data ?? [];

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contactName = (id: number) => (contactsData ?? []).find((c) => c.id === id)?.name ?? "—";

  // Built from the rows themselves rather than a fixed list, because purchase
  // and sales orders end their lifecycle in differently named states.
  const statuses = Array.from(new Set(orders.map((order) => order.status)));

  const term = search.trim().toLowerCase();
  const visible = orders.filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesSearch =
      !term ||
      order.number.toLowerCase().includes(term) ||
      contactName(order.contact_id).toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const filtered = Boolean(term || statusFilter);

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Number",
      render: (order) => <span className="tnum font-mono text-[13px] font-medium">{order.number}</span>,
      sortValue: (order) => order.number,
    },
    {
      key: "partner",
      header: partnerLabel,
      render: (order) => contactName(order.contact_id),
      sortValue: (order) => contactName(order.contact_id),
    },
    {
      key: "date",
      header: "Date",
      render: (order) => formatDate(order.date),
      sortValue: (order) => order.date,
    },
    {
      key: "due",
      header: "Due",
      render: (order) => (
        <span className="text-[var(--text-muted)]">
          {order.due_date ? formatDate(order.due_date) : "—"}
        </span>
      ),
      sortValue: (order) => order.due_date,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (order) => formatMoney(order.total),
      sortValue: (order) => order.total,
    },
    {
      key: "status",
      header: "Status",
      render: (order) => <StatusBadge status={order.status} />,
      sortValue: (order) => order.status,
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Link href={`${basePath}/new`}>
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search number or ${partnerLabel.toLowerCase()}`}
          label={`Search ${title.toLowerCase()}`}
        />
        <SegmentedFilter
          value={statusFilter}
          options={[
            { value: "", label: "All" },
            ...statuses.map((status) => ({ value: status, label: status })),
          ]}
          onChange={setStatusFilter}
          label="Filter by status"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(order) => order.id}
        onRowClick={(order) => router.push(`${basePath}/${order.id}`)}
        loading={loading}
        error={error}
        onRetry={retry}
        emptyTitle={filtered ? "No orders match" : `No ${title.toLowerCase()} yet`}
        emptyDescription={
          filtered
            ? "Try a different search term or status."
            : "Create one to start the flow through to payment."
        }
        emptyAction={
          filtered ? undefined : (
            <Link href={`${basePath}/new`}>
              <Button variant="primary" size="sm">
                New
              </Button>
            </Link>
          )
        }
      />
    </div>
  );
}
