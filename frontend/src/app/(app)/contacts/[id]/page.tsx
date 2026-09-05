import { notFound } from "next/navigation";
import { ContactForm } from "@/components/forms/ContactForm";
import { MOCK_CONTACTS } from "@/lib/mock-data";

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/contacts is ready (GET /api/contacts/{id}).
  const contact = MOCK_CONTACTS.find((record) => String(record.id) === id);
  if (!contact) notFound();
  return <ContactForm contact={contact} />;
}
