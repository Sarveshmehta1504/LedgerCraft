"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { ContactForm } from "@/components/forms/ContactForm";
import { ErrorState, TableSkeleton } from "@/components/ui/States";
import { ContactsApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { Contact } from "@/types";

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const fetchData = useCallback(() => ContactsApi.get(Number(id)), [id]);
  const { data: contact, loading, error, retry } = useAsyncData<Contact>(
    fetchData,
    "Could not load this contact.",
  );

  if (loading) return <TableSkeleton rows={4} columns={2} />;
  if (error || !contact) return <ErrorState message={error ?? "Contact not found."} onRetry={retry} />;
  return <ContactForm contact={contact} />;
}
