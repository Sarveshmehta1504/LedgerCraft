"use client";

import { OrderList } from "@/components/shared/OrderList";
import { MOCK_PURCHASE_ORDERS } from "@/lib/mock-data";

export default function PurchaseOrdersPage() {
  // TODO: replace with real API once backend/purchase-orders is ready (GET /api/purchase-orders).
  return (
    <OrderList
      title="Purchase Orders"
      subtitle="Draft to confirmed to billed"
      partnerLabel="Vendor"
      basePath="/purchases"
      source={MOCK_PURCHASE_ORDERS}
    />
  );
}
