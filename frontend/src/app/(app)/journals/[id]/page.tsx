import { notFound } from "next/navigation";
import { JournalForm } from "@/components/forms/JournalForm";
import { MOCK_JOURNALS } from "@/lib/mock-data";

export default async function EditJournalPage({ params }: PageProps<"/journals/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/journals is ready (GET /api/journals/{id}).
  const journal = MOCK_JOURNALS.find((record) => String(record.id) === id);
  if (!journal) notFound();
  return <JournalForm journal={journal} />;
}
