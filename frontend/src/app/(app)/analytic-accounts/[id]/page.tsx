"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { AnalyticAccountForm } from "@/components/forms/AnalyticAccountForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { AnalyticAccountsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { AnalyticAccount } from "@/types";

export default function AnalyticAccountPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => AnalyticAccountsApi.get(Number(id)), [id]);
  const { data: account, loading, error, retry } = useAsyncData<AnalyticAccount>(
    fetchData,
    "Could not load this analytic account.",
  );

  if (loading) return <TableSkeleton rows={3} columns={2} />;
  if (error || !account)
    return <ErrorState message={error ?? "Analytic account not found."} onRetry={retry} />;
  return <AnalyticAccountForm account={account} />;
}
