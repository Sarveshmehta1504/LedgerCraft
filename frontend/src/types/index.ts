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

/**
 * A row from the admin user directory. Richer than the signed-in `User`: the
 * admin screens also need the linked contact and whether the account is
 * currently deactivated.
 */
export interface ManagedUser extends User {
  contact: { id: number; name: string } | null;
  deactivated_at: string | null;
  created_at: string | null;
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
  /** Archived rather than deleted: existing documents still reference it. */
  archived_at: string | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  parent_id: number | null;
  /** Archived rather than deleted: existing documents still reference it. */
  archived_at: string | null;
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
  /** Archived rather than deleted: existing documents still reference it. */
  archived_at: string | null;
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
  /** Archived rather than deleted: existing documents still reference it. */
  archived_at: string | null;
}

export type JournalType = "sales" | "purchase" | "bank" | "cash";

export interface Journal {
  id: number;
  name: string;
  type: JournalType;
  default_debit_account: number | null;
  default_credit_account: number | null;
  /** Archived rather than deleted: existing documents still reference it. */
  archived_at: string | null;
}

/* ---- Ledger ---- */

export type JournalEntrySource =
  | "vendor_bill"
  | "customer_invoice"
  | "payment"
  | "opening_balance"
  | "manual";

export interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  /** Resolved `code name` from the API, so the row needs no second lookup. */
  account_name: string | null;
  debit: number;
  credit: number;
  analytic_account_id: number | null;
  analytic_account_name: string | null;
  description: string | null;
}

/**
 * Mirrors GET /api/journal-entries. The ledger is read-only over the API —
 * entries are written by the system when a document is posted — so there is no
 * draft/posted status: an entry that exists is posted.
 */
export interface JournalEntry {
  id: number;
  journal_id: number;
  journal_name: string | null;
  date: string;
  reference: string | null;
  source_type: JournalEntrySource;
  source_id: number | null;
  total_debit: number;
  total_credit: number;
  balanced: boolean;
  /**
   * Derived by the API from the source document, so there is nothing to submit.
   * Opening-balance entries have no partner by design.
   */
  partner: { id: number; name: string; type: ContactType } | null;
  /** Only populated by the detail endpoint; the list omits lines. */
  lines: JournalEntryLine[];
}

/* ---- Analytic accounting ---- */

export type AnalyticAccountType = "income" | "expense";

export interface AnalyticAccount {
  id: number;
  name: string;
  type: AnalyticAccountType;
  /** Archived rather than deleted: a budget may still reference the account. */
  archived_at: string | null;
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
  number: string;
  contact_id: number;
  date: string;
  /** Carried onto the bill on conversion, which is what puts it in the aging report. */
  due_date: string | null;
  /** Present once the order has been converted. */
  bill?: ConvertedDocument | null;
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

/** The document an order became, as the API embeds it once converted. */
export interface ConvertedDocument {
  id: number;
  number: string;
  status: string;
}

export interface SalesOrder {
  id: number;
  number: string;
  contact_id: number;
  date: string;
  /** Carried onto the invoice on conversion, which is what puts it in the aging report. */
  due_date: string | null;
  /** Present once the order has been converted. */
  invoice?: ConvertedDocument | null;
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
/* Shapes below match the live GET /api/reports/* responses exactly — not the
   board's mockup — since these two are wired to the real backend. */

export interface ReportLine {
  account: string;
  balance: number;
}

export interface ReportAccountGroup {
  accounts: ReportLine[];
  total: number;
}

export interface BalanceSheet {
  as_of: string | null;
  assets: ReportAccountGroup;
  liabilities: ReportAccountGroup;
  capital: ReportAccountGroup & { retained_earnings: number };
  total_assets: number;
  total_liabilities_and_capital: number;
  /** Computed server-side — no need to re-derive it from a float comparison. */
  balanced: boolean;
}

export interface ProfitAndLoss {
  period: { from: string | null; to: string | null };
  income: ReportAccountGroup;
  purchase_expense: ReportAccountGroup;
  /** The board separates account type `other_expense` into its own total. */
  other_expense: ReportAccountGroup;
  total_income: number;
  total_expenses: number;
  net_income: number;
}

export interface BudgetReportRow {
  budget_id: number;
  name: string;
  analytic_account: string;
  planned_amount: number;
  actual_amount: number;
  variance: number;
  status: BudgetStatus;
  /**
   * False for a superseded (`revised`) or `cancelled` budget. Those stay on the
   * report so the original commitment is auditable, but they must never be
   * added to a total or weighted in a chart.
   */
  counted_in_totals: boolean;
}

/** The budget report as the API returns it: rows plus its own correct totals. */
export interface BudgetReport {
  rows: BudgetReportRow[];
  total_planned: number;
  total_actual: number;
  total_remaining: number;
  achieved_percent: number;
}
