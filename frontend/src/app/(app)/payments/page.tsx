"use client";

import { useCallback } from "react";
import { PaymentList } from "@/components/shared/PaymentList";
import { VendorBillsApi } from "@/lib/resources";

export default function PaymentsPage() {
  const fetcher = useCallback(() => VendorBillsApi.list(), []);
  return (
    <PaymentList
      title="Payments"
      subtitle="Amounts settled against vendor bills"
      partnerLabel="Vendor"
      fetcher={fetcher}
    />
  );
}
