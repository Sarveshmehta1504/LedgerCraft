import { notFound } from "next/navigation";
import { BillForm } from "@/components/forms/BillForm";
import { MOCK_VENDOR_BILLS } from "@/lib/mock-data";

export default async function VendorBillPage({ params }: PageProps<"/bills/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/vendor-bills is ready (GET /api/vendor-bills/{id}).
  const bill = MOCK_VENDOR_BILLS.find((record) => String(record.id) === id);
  if (!bill) notFound();
  return <BillForm side="bill" document={bill} />;
}
