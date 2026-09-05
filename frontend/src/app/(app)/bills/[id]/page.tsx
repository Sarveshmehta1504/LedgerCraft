"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { BillForm } from "@/components/forms/BillForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { VendorBillsApi } from "@/lib/resources";
import type { VendorBillDetail } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";

export default function VendorBillPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => VendorBillsApi.get(Number(id)), [id]);
  const { data: bill, loading, error, retry } = useAsyncData<VendorBillDetail>(
    fetchData,
    "Could not load this vendor bill.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !bill) return <ErrorState message={error ?? "Vendor bill not found."} onRetry={retry} />;
  return <BillForm side="bill" document={bill} />;
}
