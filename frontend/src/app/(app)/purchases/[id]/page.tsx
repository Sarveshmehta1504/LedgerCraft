"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { OrderForm } from "@/components/forms/OrderForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { PurchaseOrdersApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { PurchaseOrder } from "@/types";

export default function PurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => PurchaseOrdersApi.get(Number(id)), [id]);
  const { data: order, loading, error, retry } = useAsyncData<PurchaseOrder>(
    fetchData,
    "Could not load this purchase order.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !order) return <ErrorState message={error ?? "Purchase order not found."} onRetry={retry} />;
  return <OrderForm side="purchase" order={order} />;
}
