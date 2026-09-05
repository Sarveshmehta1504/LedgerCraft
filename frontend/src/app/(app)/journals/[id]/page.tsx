"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { JournalForm } from "@/components/forms/JournalForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { JournalsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Journal } from "@/types";

export default function EditJournalPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => JournalsApi.get(Number(id)), [id]);
  const { data: journal, loading, error, retry } = useAsyncData<Journal>(
    fetchData,
    "Could not load this journal.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !journal) return <ErrorState message={error ?? "Journal not found."} onRetry={retry} />;
  return <JournalForm journal={journal} />;
}
