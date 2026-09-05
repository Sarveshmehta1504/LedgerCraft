import { notFound } from "next/navigation";
import { BudgetForm } from "@/components/forms/BudgetForm";
import { MOCK_BUDGETS } from "@/lib/mock-data";

export default async function EditBudgetPage({ params }: PageProps<"/budgets/[id]">) {
  const { id } = await params;
  // TODO: replace with real API once backend/budgets is ready (GET /api/budgets/{id}).
  const budget = MOCK_BUDGETS.find((record) => String(record.id) === id);
  if (!budget) notFound();
  return <BudgetForm budget={budget} />;
}
