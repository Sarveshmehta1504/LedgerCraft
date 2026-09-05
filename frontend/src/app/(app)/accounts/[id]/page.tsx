"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { AccountForm } from "@/components/forms/AccountForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { AccountsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ChartOfAccount } from "@/types";

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => AccountsApi.get(Number(id)), [id]);
  const { data: account, loading, error, retry } = useAsyncData<ChartOfAccount>(
    fetchData,
    "Could not load this account.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !account) return <ErrorState message={error ?? "Account not found."} onRetry={retry} />;
  return <AccountForm account={account} />;
}
