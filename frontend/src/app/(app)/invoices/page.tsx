"use client";

import { BillList } from "@/components/shared/BillList";
import { MOCK_CUSTOMER_INVOICES } from "@/lib/mock-data";

export default function CustomerInvoicesPage() {
  // TODO: replace with real API once backend/customer-invoices is ready (GET /api/customer-invoices).
  return (
    <BillList
      title="Customer Invoices"
      subtitle="Post to the ledger, then collect"
      partnerLabel="Customer"
      basePath="/invoices"
      source={MOCK_CUSTOMER_INVOICES}
    />
  );
}
