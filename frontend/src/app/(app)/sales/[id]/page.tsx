"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { OrderForm } from "@/components/forms/OrderForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { SalesOrdersApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { SalesOrder } from "@/types";

export default function SalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => SalesOrdersApi.get(Number(id)), [id]);
  const { data: order, loading, error, retry } = useAsyncData<SalesOrder>(
    fetchData,
    "Could not load this sales order.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !order) return <ErrorState message={error ?? "Sales order not found."} onRetry={retry} />;
  return <OrderForm side="sales" order={order} />;
}
