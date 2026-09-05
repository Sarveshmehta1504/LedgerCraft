"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { JournalEntryView } from "@/components/forms/JournalEntryView";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { JournalEntriesApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { JournalEntry } from "@/types";

export default function JournalEntryPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => JournalEntriesApi.get(Number(id)), [id]);
  const { data: entry, loading, error, retry } = useAsyncData<JournalEntry>(
    fetchData,
    "Could not load this journal entry.",
  );

  if (loading) return <TableSkeleton rows={4} columns={4} />;
  if (error || !entry)
    return <ErrorState message={error ?? "Journal entry not found."} onRetry={retry} />;
  return <JournalEntryView entry={entry} />;
}
