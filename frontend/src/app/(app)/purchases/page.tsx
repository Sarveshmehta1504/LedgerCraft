"use client";

import { useCallback } from "react";
import { OrderList } from "@/components/shared/OrderList";
import { PurchaseOrdersApi } from "@/lib/resources";

export default function PurchaseOrdersPage() {
  const fetcher = useCallback(() => PurchaseOrdersApi.list(), []);
  return (
    <OrderList
      title="Purchase Orders"
      subtitle="Draft to confirmed to billed"
      partnerLabel="Vendor"
      basePath="/purchases"
      fetcher={fetcher}
    />
  );
}
