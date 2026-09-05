import { notFound } from "next/navigation";
import { BillForm } from "@/components/forms/BillForm";
import { MOCK_CUSTOMER_INVOICES } from "@/lib/mock-data";

export default async function CustomerInvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/customer-invoices is ready (GET /api/customer-invoices/{id}).
  const invoice = MOCK_CUSTOMER_INVOICES.find((record) => String(record.id) === id);
  if (!invoice) notFound();
  return <BillForm side="invoice" document={invoice} />;
}
