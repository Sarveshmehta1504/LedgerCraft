"use client";

import { PaymentList } from "@/components/shared/PaymentList";
import { MOCK_CUSTOMER_INVOICES } from "@/lib/mock-data";

export default function ReceiptsPage() {
  return (
    <PaymentList
      title="Receipts"
      subtitle="Amounts collected against customer invoices"
      partnerLabel="Customer"
      source={MOCK_CUSTOMER_INVOICES}
    />
  );
}
