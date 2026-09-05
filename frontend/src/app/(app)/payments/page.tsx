"use client";

import { PaymentList } from "@/components/shared/PaymentList";
import { MOCK_VENDOR_BILLS } from "@/lib/mock-data";

export default function PaymentsPage() {
  return (
    <PaymentList
      title="Payments"
      subtitle="Amounts settled against vendor bills"
      partnerLabel="Vendor"
      source={MOCK_VENDOR_BILLS}
    />
  );
}
