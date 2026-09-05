"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { BudgetForm } from "@/components/forms/BudgetForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { BudgetsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Budget } from "@/types";

export default function EditBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => BudgetsApi.get(Number(id)), [id]);
  const { data: budget, loading, error, retry } = useAsyncData<Budget>(
    fetchData,
    "Could not load this budget.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !budget) return <ErrorState message={error ?? "Budget not found."} onRetry={retry} />;
  return <BudgetForm budget={budget} />;
}
