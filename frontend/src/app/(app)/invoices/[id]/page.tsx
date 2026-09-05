"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { BillForm } from "@/components/forms/BillForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { CustomerInvoicesApi } from "@/lib/resources";
import type { CustomerInvoiceDetail } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";

export default function CustomerInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => CustomerInvoicesApi.get(Number(id)), [id]);
  const { data: invoice, loading, error, retry } = useAsyncData<CustomerInvoiceDetail>(
    fetchData,
    "Could not load this customer invoice.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !invoice) return <ErrorState message={error ?? "Customer invoice not found."} onRetry={retry} />;
  return <BillForm side="invoice" document={invoice} />;
}
