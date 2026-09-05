import { notFound } from "next/navigation";
import { AccountForm } from "@/components/forms/AccountForm";
import { MOCK_ACCOUNTS } from "@/lib/mock-data";

export default async function EditAccountPage({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/accounts is ready (GET /api/accounts/{id}).
  const account = MOCK_ACCOUNTS.find((record) => String(record.id) === id);
  if (!account) notFound();
  return <AccountForm account={account} />;
}
