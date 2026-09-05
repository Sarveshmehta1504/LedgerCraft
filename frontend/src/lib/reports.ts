/**
 * Report figures derived from the placeholder ledger so the numbers on screen are
 * internally consistent (assets really do equal liabilities + capital).
 *
 * TODO: replace with real API once backend/reports is ready — the backend computes
 * these live from journal_entry_lines (GET /api/reports/balance-sheet, /profit-and-loss,
 * /budget). Nothing here should survive that wiring.
 */

import type { BalanceSheet, BudgetReportRow, ProfitAndLoss } from "@/types";
import { MOCK_BUDGETS, analyticName } from "./mock-data";

export function buildProfitAndLoss(): ProfitAndLoss {
  const income = [
    { account: "Sale Income", balance: 109200 },
    { account: "Assembly Services", balance: 7500 },
  ];
  // Account type `expense`
  const expenses = [
    { account: "Purchase Expense", balance: 43475 },
    { account: "Freight & Delivery", balance: 6180 },
  ];
  // Account type `other_expense` — reported separately per the design board
  const other_expenses = [{ account: "Workshop Rent", balance: 24000 }];

  const total_income = income.reduce((sum, row) => sum + row.balance, 0);
  const total_expenses = expenses.reduce((sum, row) => sum + row.balance, 0);
  const total_other_expenses = other_expenses.reduce((sum, row) => sum + row.balance, 0);

  return {
    income,
    expenses,
    other_expenses,
    total_income,
    total_expenses,
    total_other_expenses,
    net_profit: total_income - total_expenses - total_other_expenses,
  };
}

export function buildBalanceSheet(): BalanceSheet {
  const { net_profit } = buildProfitAndLoss();

  const assets = [
    { account: "Cash", balance: 38400 },
    { account: "Bank — HDFC Current", balance: 142850 },
    { account: "Debtors / Accounts Receivable", balance: 49880 },
    { account: "Inventory", balance: 76420 },
  ];
  const liabilities = [{ account: "Creditors / Accounts Payable", balance: 31475 }];

  const total_assets = assets.reduce((sum, row) => sum + row.balance, 0);
  const total_liabilities = liabilities.reduce((sum, row) => sum + row.balance, 0);

  // Capital is the balancing figure: retained profit plus opening capital.
  const openingCapital = total_assets - total_liabilities - net_profit;
  const capital = [
    { account: "Owner's Capital", balance: openingCapital },
    { account: "Retained Profit", balance: net_profit },
  ];

  return {
    assets,
    liabilities,
    capital,
    total_assets,
    total_liabilities_and_capital:
      total_liabilities + capital.reduce((sum, row) => sum + row.balance, 0),
  };
}

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
