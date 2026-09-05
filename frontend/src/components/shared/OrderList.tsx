"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { contactName, mockRequest } from "@/lib/mock-data";
import type { PurchaseOrder, SalesOrder } from "@/types";

type Order = PurchaseOrder | SalesOrder;

/** Shared list surface for Purchase Orders and Sales Orders — identical shape, different labels. */
export function OrderList({
  title,
  subtitle,
  partnerLabel,
  basePath,
  source,
}: {
  title: string;
  subtitle: string;
  partnerLabel: string;
  basePath: string;
  source: Order[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await mockRequest(source));
    } catch {
      setError("The order service did not respond.");
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  const statuses = Array.from(new Set(source.map((order) => order.status)));
  const visible = statusFilter
    ? orders.filter((order) => order.status === statusFilter)
    : orders;

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "Number",
      render: (order) => (
        <span className="tnum font-mono text-[13px] font-medium">
          {basePath === "/purchases" ? "PO" : "SO"}/{String(order.id).padStart(4, "0")}
        </span>
      ),
    },
    { key: "partner", header: partnerLabel, render: (order) => contactName(order.contact_id) },
    { key: "date", header: "Date", render: (order) => formatDate(order.date) },
    { key: "total", header: "Total", numeric: true, render: (order) => formatMoney(order.total) },
    { key: "status", header: "Status", render: (order) => <StatusBadge status={order.status} /> },
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

      <div className="flex items-center gap-1 border-b border-[var(--line)] px-5 py-2.5">
        {[{ value: "", label: "All" }, ...statuses.map((s) => ({ value: s, label: s }))].map(
          (filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              aria-pressed={statusFilter === filter.value}
              className={`h-8 cursor-pointer rounded-md px-2.5 text-[13px] font-medium capitalize transition-colors duration-150 ${
                statusFilter === filter.value
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              {filter.label}
            </button>
          ),
        )}
      </div>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(order) => order.id}
        onRowClick={(order) => router.push(`${basePath}/${order.id}`)}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription="Create one to start the flow through to payment."
        emptyAction={
          <Link href={`${basePath}/new`}>
            <Button variant="primary" size="sm">
              New
            </Button>
          </Link>
        }
      />
    </div>
  );
}
