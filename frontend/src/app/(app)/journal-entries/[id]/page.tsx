import { notFound } from "next/navigation";
import { JournalEntryForm } from "@/components/forms/JournalEntryForm";
import { MOCK_JOURNAL_ENTRIES } from "@/lib/mock-data";

export default async function JournalEntryPage({ params }: PageProps<"/journal-entries/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/journal-entries is ready (GET /api/journal-entries/{id}).
  const entry = MOCK_JOURNAL_ENTRIES.find((record) => String(record.id) === id);
  if (!entry) notFound();
  return <JournalEntryForm entry={entry} />;
}
