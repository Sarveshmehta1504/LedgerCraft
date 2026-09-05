"use client";

import { OrderList } from "@/components/shared/OrderList";
import { MOCK_SALES_ORDERS } from "@/lib/mock-data";

export default function SalesOrdersPage() {
  // TODO: replace with real API once backend/sales-orders is ready (GET /api/sales-orders).
  return (
    <OrderList
      title="Sales Orders"
      subtitle="Draft to confirmed to invoiced"
      partnerLabel="Customer"
      basePath="/sales"
      source={MOCK_SALES_ORDERS}
    />
  );
}
