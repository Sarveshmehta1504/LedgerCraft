"use client";

import { BillList } from "@/components/shared/BillList";
import { MOCK_VENDOR_BILLS } from "@/lib/mock-data";

export default function VendorBillsPage() {
  // TODO: replace with real API once backend/vendor-bills is ready (GET /api/vendor-bills).
  return (
    <BillList
      title="Vendor Bills"
      subtitle="Post to the ledger, then settle"
      partnerLabel="Vendor"
      basePath="/bills"
      source={MOCK_VENDOR_BILLS}
    />
  );
}
