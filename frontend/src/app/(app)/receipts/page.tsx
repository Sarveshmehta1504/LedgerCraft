"use client";

import { useCallback } from "react";
import { PaymentList } from "@/components/shared/PaymentList";
import { CustomerInvoicesApi } from "@/lib/resources";

export default function ReceiptsPage() {
  const fetcher = useCallback(() => CustomerInvoicesApi.list(), []);
  return (
    <PaymentList
      title="Receipts"
      subtitle="Amounts collected against customer invoices"
      partnerLabel="Customer"
      fetcher={fetcher}
    />
  );
}
