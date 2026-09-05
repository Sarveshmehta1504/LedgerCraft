import { notFound } from "next/navigation";
import { AnalyticAccountForm } from "@/components/forms/AnalyticAccountForm";
import { MOCK_ANALYTIC_ACCOUNTS } from "@/lib/mock-data";

export default async function AnalyticAccountPage({ params }: PageProps<"/analytic-accounts/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/analytic-accounts is ready (GET /api/analytic-accounts/{id}).
  const account = MOCK_ANALYTIC_ACCOUNTS.find((record) => String(record.id) === id);
  if (!account) notFound();
  return <AnalyticAccountForm account={account} />;
}
