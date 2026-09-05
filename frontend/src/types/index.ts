/**
 * Domain types mirrored from docs/DB_SCHEMA.md and docs/API_DOCUMENTATION.md.
 * Field names match the backend columns exactly so wiring up the real API later
 * is a swap of the data source, not a rename of every field.
 */

export type Role = "admin" | "accountant" | "user";

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface User {
  id: number;
  name: string;
  login_id: string;
  email: string;
  contact_id: number | null;
  role: Role;
}

/* ---- Master data ---- */

export type ContactType = "customer" | "vendor" | "both";

export interface Contact {
  id: number;
  name: string;
  type: ContactType;
  email: string | null;
  mobile: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_pin: string | null;
  profile_image: string | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  parent_id: number | null;
}

export type ProductType = "goods" | "service" | "combo";

export interface Product {
  id: number;
  name: string;
  type: ProductType;
  sales_price: number;
  cost_price: number;
  category_id: number;
  category?: ProductCategory;
}

/** All eight account types from the mockup — the PS's five are a subset. */
export type AccountType =
  | "asset"
  | "liability"
  | "bank"
  | "capital"
  | "cash"
  | "income"
  | "expense"
  | "other_expense";

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: AccountType;
}

export type JournalType = "sales" | "purchase" | "bank" | "cash";

export interface Journal {
  id: number;
  name: string;
  type: JournalType;
  default_debit_account: number | null;
  default_credit_account: number | null;
}

/* ---- Ledger ---- */

export type JournalEntrySource = "vendor_bill" | "customer_invoice" | "payment" | "manual";

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  contact_id: number | null;
  debit: number;
  credit: number;
  analytic_account_id: number | null;
  description: string | null;
}

export interface JournalEntry {
  id: number;
  journal_id: number;
  date: string;
  reference: string | null;
  source_type: JournalEntrySource;
  source_id: number | null;
  status: "draft" | "posted";
  total: number;
  lines: JournalEntryLine[];
}

/* ---- Analytic accounting ---- */

export interface AnalyticAccount {
  id: number;
  name: string;
  type: "income" | "expense";
}

export type BudgetStatus = "draft" | "confirmed" | "revised" | "cancelled";

export interface Budget {
  id: number;
  name: string;
  analytic_account_id: number;
  period_start: string;
  period_end: string;
  committed_amount: number;
  /** Computed live by the backend, not stored. */
  actual_amount: number;
  responsible_id: number;
  status: BudgetStatus;
  revision_of_id: number | null;
}

/* ---- Transactions ---- */

export type DocumentStatus =
  | "draft"
  | "confirmed"
  | "billed"
  | "invoiced"
  | "posted"
  | "paid"
  | "cancelled";

/** One row of the shared line grid: Product | Account | Analytic | Qty | Price | Total. */
export interface DocumentLine {
  id: string;
  product_id: number | null;
  account_id: number | null;
  analytic_account_id: number | null;
  quantity: number;
  unit_price: number;
  /** Sales-side only — the PS omits tax from purchase documents. */
  tax_percent?: number;
}

export interface PurchaseOrder {
  id: number;
  contact_id: number;
  date: string;
  status: Extract<DocumentStatus, "draft" | "confirmed" | "billed">;
  total: number;
  lines: DocumentLine[];
}

export interface VendorBill {
  id: number;
  purchase_order_id: number | null;
  contact_id: number;
  bill_number: string;
  bill_reference: string | null;
  bill_date: string;
  due_date: string | null;
  status: Extract<DocumentStatus, "draft" | "posted" | "paid">;
  total: number;
  amount_paid: number;
  journal_entry_id: number | null;
  lines: DocumentLine[];
}

export interface SalesOrder {
  id: number;
  contact_id: number;
  date: string;
  status: Extract<DocumentStatus, "draft" | "confirmed" | "invoiced">;
  total: number;
  lines: DocumentLine[];
}

export interface CustomerInvoice {
  id: number;
  sales_order_id: number | null;
  contact_id: number;
  invoice_number: string;
  invoice_reference: string | null;
  invoice_date: string;
  due_date: string | null;
  status: Extract<DocumentStatus, "draft" | "posted" | "paid">;
  total: number;
  amount_paid: number;
  journal_entry_id: number | null;
  lines: DocumentLine[];
}

export type PaymentVia = "bank" | "cash";

export interface Payment {
  id: number;
  contact_id: number;
  payment_type: "send" | "receive";
  payable_type: "vendor_bill" | "customer_invoice";
  payable_id: number;
  payment_via: PaymentVia;
  journal_id: number;
  amount: number;
  date: string;
  note: string | null;
}

/* ---- Reports ---- */

export interface ReportLine {
  account: string;
  balance: number;
}

export interface BalanceSheet {
  assets: ReportLine[];
  liabilities: ReportLine[];
  capital: ReportLine[];
  total_assets: number;
  total_liabilities_and_capital: number;
}

export interface ProfitAndLoss {
  income: ReportLine[];
  expenses: ReportLine[];
  total_income: number;
  total_expenses: number;
  net_profit: number;
}

export interface BudgetReportRow {
  budget_id: number;
  name: string;
  analytic_account: string;
  planned_amount: number;
  actual_amount: number;
  variance: number;
}
