"use client";

import { useCallback } from "react";
import { OrderList } from "@/components/shared/OrderList";
import { SalesOrdersApi } from "@/lib/resources";

export default function SalesOrdersPage() {
  const fetcher = useCallback(() => SalesOrdersApi.list(), []);
  return (
    <OrderList
      title="Sales Orders"
      subtitle="Draft to confirmed to invoiced"
      partnerLabel="Customer"
      basePath="/sales"
      fetcher={fetcher}
    />
  );
}
