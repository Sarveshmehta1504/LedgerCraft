"use client";

import { useCallback } from "react";
import { BillList } from "@/components/shared/BillList";
import { CustomerInvoicesApi } from "@/lib/resources";

export default function CustomerInvoicesPage() {
  const fetcher = useCallback(() => CustomerInvoicesApi.list(), []);
  return (
    <BillList
      title="Customer Invoices"
      subtitle="Post to the ledger, then collect"
      partnerLabel="Customer"
      basePath="/invoices"
      fetcher={fetcher}
    />
  );
}
