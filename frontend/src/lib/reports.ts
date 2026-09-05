/**
 * Budget report figures derived from the placeholder budgets, so the numbers on
 * screen stay internally consistent.
 *
 * TODO: replace with real API once backend/budgets exists — there is no budgets
 * route yet. Balance Sheet and Profit & Loss are wired to the real
 * GET /api/reports/balance-sheet and /profit-and-loss and no longer use this file.
 */

import type { BudgetReportRow } from "@/types";
import { MOCK_BUDGETS, analyticName } from "./mock-data";

export function buildBudgetReport(): BudgetReportRow[] {
  return MOCK_BUDGETS.filter((budget) => budget.status !== "draft").map((budget) => ({
    budget_id: budget.id,
    name: budget.name,
    analytic_account: analyticName(budget.analytic_account_id),
    planned_amount: budget.committed_amount,
    actual_amount: budget.actual_amount,
    variance: budget.actual_amount - budget.committed_amount,
  }));
}
