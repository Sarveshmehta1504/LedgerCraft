"use client";

import { useCallback } from "react";
import { BillList } from "@/components/shared/BillList";
import { VendorBillsApi } from "@/lib/resources";

export default function VendorBillsPage() {
  const fetcher = useCallback(() => VendorBillsApi.list(), []);
  return (
    <BillList
      title="Vendor Bills"
      subtitle="Post to the ledger, then settle"
      partnerLabel="Vendor"
      basePath="/bills"
      fetcher={fetcher}
    />
  );
}
