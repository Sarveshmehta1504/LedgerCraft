/**
 * Laravel serializes decimal columns as strings ("18500.00") and nests
 * relations under their own key. The frontend types want plain numbers and a
 * flat-enough shape for the UI, so every real API response passes through one
 * of these mappers before it reaches a component. Nothing here talks to the
 * network — pure functions, raw JSON in, typed object out.
 */

import type {
  AnalyticAccount,
  BalanceSheet,
  Budget,
  BudgetReport,
  BudgetReportRow,
  ChartOfAccount,
  Contact,
  CustomerInvoice,
  DocumentLine,
  Journal,
  JournalEntry,
  JournalEntryLine,
  ManagedUser,
  Payment,
  Product,
  ProductCategory,
  ProfitAndLoss,
  PurchaseOrder,
  ReportAccountGroup,
  SalesOrder,
  User,
  VendorBill,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

/** Laravel sends dates as full ISO timestamps; the date inputs want `YYYY-MM-DD`. */
const day = (value: unknown): string =>
  typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";

export function mapAnalyticAccount(raw: Raw): AnalyticAccount {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
  };
}

/**
 * The API calls the live-computed figure `achieved_amount`; the UI has always
 * called it `actual_amount`, so the rename happens here rather than in every
 * screen that reads it.
 */
export function mapBudget(raw: Raw): Budget {
  return {
    id: raw.id,
    name: raw.name,
    analytic_account_id: raw.analytic_account_id,
    period_start: day(raw.period_start),
    period_end: day(raw.period_end),
    committed_amount: num(raw.committed_amount),
    actual_amount: num(raw.achieved_amount),
    responsible_id: raw.responsible_id,
    status: raw.status,
    revision_of_id: raw.revision_of_id ?? null,
  };
}

export function mapBudgetReportRow(raw: Raw): BudgetReportRow {
  const planned = num(raw.committed_amount);
  const actual = num(raw.achieved_amount);
  return {
    budget_id: raw.id,
    name: raw.name,
    analytic_account: raw.analytic_account?.name ?? "—",
    planned_amount: planned,
    actual_amount: actual,
    variance: actual - planned,
    status: raw.status,
    // Absent means countable: only a superseded or cancelled row is flagged off.
    counted_in_totals: raw.counted_in_totals !== false,
  };
}

/**
 * The whole budget report. The API's totals already exclude superseded and
 * cancelled budgets, so they are taken as given rather than re-summed here.
 */
export function mapBudgetReport(raw: Raw): BudgetReport {
  return {
    rows: (raw.budgets ?? []).map(mapBudgetReportRow),
    total_planned: num(raw.total_committed),
    total_actual: num(raw.total_achieved),
    total_remaining: num(raw.total_remaining),
    achieved_percent: num(raw.overall_achieved_percent),
  };
}

export function mapJournalEntryLine(raw: Raw): JournalEntryLine {
  return {
    id: raw.id,
    journal_entry_id: raw.journal_entry_id,
    account_id: raw.account_id,
    account_name: raw.account ? `${raw.account.code} ${raw.account.name}` : null,
    debit: num(raw.debit),
    credit: num(raw.credit),
    analytic_account_id: raw.analytic_account_id ?? null,
    analytic_account_name: raw.analytic_account?.name ?? null,
    description: raw.description ?? null,
  };
}

/**
 * Entries are system-generated when a document is posted, so the API has no
 * status column — anything that exists is already in the ledger. `total` is the
 * debit side, which equals the credit side on every balanced entry.
 */
export function mapJournalEntry(raw: Raw): JournalEntry {
  return {
    id: raw.id,
    journal_id: raw.journal_id,
    journal_name: raw.journal?.name ?? null,
    date: day(raw.date),
    reference: raw.reference ?? null,
    source_type: raw.source_type,
    source_id: raw.source_id ?? null,
    total_debit: num(raw.total_debit),
    total_credit: num(raw.total_credit),
    balanced: Boolean(raw.balanced),
    partner: raw.partner
      ? { id: raw.partner.id, name: raw.partner.name, type: raw.partner.type }
      : null,
    lines: Array.isArray(raw.lines) ? raw.lines.map(mapJournalEntryLine) : [],
  };
}

export function mapUser(raw: Raw): User {
  return {
    id: raw.id,
    name: raw.name,
    login_id: raw.login_id,
    email: raw.email,
    contact_id: raw.contact_id,
    role: raw.role,
  };
}

export function mapManagedUser(raw: Raw): ManagedUser {
  return {
    ...mapUser(raw),
    // The API sends the whole contact record; the directory only shows its name.
    contact: raw.contact ? { id: raw.contact.id, name: raw.contact.name } : null,
    deactivated_at: raw.deactivated_at ?? null,
    created_at: raw.created_at ?? null,
  };
}

export function mapContact(raw: Raw): Contact {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    email: raw.email,
    mobile: raw.mobile,
    address_street: raw.address_street,
    address_city: raw.address_city,
    address_state: raw.address_state,
    address_country: raw.address_country,
    address_pin: raw.address_pin,
    profile_image: raw.profile_image,
  };
}

export function mapProductCategory(raw: Raw): ProductCategory {
  return { id: raw.id, name: raw.name, parent_id: raw.parent_id };
}

export function mapProduct(raw: Raw): Product {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    sales_price: num(raw.sales_price),
    cost_price: num(raw.cost_price),
    category_id: raw.category_id,
    category: raw.category ? mapProductCategory(raw.category) : undefined,
  };
}

export function mapAccount(raw: Raw): ChartOfAccount {
  return { id: raw.id, code: raw.code, name: raw.name, type: raw.type };
}

export function mapJournal(raw: Raw): Journal {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    default_debit_account: raw.default_debit_account,
    default_credit_account: raw.default_credit_account,
  };
}

function mapLine(raw: Raw): DocumentLine {
  return {
    id: String(raw.id),
    product_id: raw.product_id,
    account_id: raw.account_id,
    analytic_account_id: raw.analytic_account_id,
    quantity: num(raw.quantity),
    unit_price: num(raw.unit_price),
    tax_percent: raw.tax_percent !== undefined ? num(raw.tax_percent) : undefined,
  };
}

export function mapPurchaseOrder(raw: Raw): PurchaseOrder {
  return {
    id: raw.id,
    number: raw.number,
    contact_id: raw.contact_id,
    date: raw.date,
    bill: raw.bill
      ? { id: raw.bill.id, number: raw.bill.bill_number, status: raw.bill.status }
      : null,
    status: raw.status,
    total: num(raw.total),
    lines: (raw.lines ?? []).map(mapLine),
  };
}

export function mapSalesOrder(raw: Raw): SalesOrder {
  return {
    id: raw.id,
    number: raw.number,
    contact_id: raw.contact_id,
    date: raw.date,
    invoice: raw.invoice
      ? { id: raw.invoice.id, number: raw.invoice.invoice_number, status: raw.invoice.status }
      : null,
    status: raw.status,
    total: num(raw.total),
    lines: (raw.lines ?? []).map(mapLine),
  };
}

/** One line of a portal invoice, with the product name the API resolves for us. */
export interface PortalInvoiceLine {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
}

/** GET /my/invoices/{id} — richer than the list row: lines, contact and amounts. */
export interface PortalInvoice extends CustomerInvoice {
  contact_name: string;
  contact_email: string | null;
  amount_due: number;
  portal_lines: PortalInvoiceLine[];
}

export function mapPortalInvoice(raw: Raw): PortalInvoice {
  return {
    ...mapCustomerInvoice(raw),
    contact_name: raw.contact?.name ?? "—",
    contact_email: raw.contact?.email ?? null,
    amount_due: num(raw.amount_due),
    portal_lines: (raw.lines ?? []).map((line: Raw) => ({
      id: line.id,
      product_name: line.product?.name ?? "—",
      quantity: num(line.quantity),
      unit_price: num(line.unit_price),
      tax_percent: num(line.tax_percent),
      tax_amount: num(line.tax_amount),
      line_total: num(line.line_total),
    })),
  };
}

export function mapVendorBill(raw: Raw): VendorBill {
  return {
    id: raw.id,
    purchase_order_id: raw.purchase_order_id,
    contact_id: raw.contact_id,
    bill_number: raw.bill_number,
    bill_reference: raw.bill_reference,
    bill_date: raw.bill_date,
    due_date: raw.due_date,
    status: raw.status,
    total: num(raw.total),
    amount_paid: num(raw.amount_paid),
    journal_entry_id: raw.journal_entry_id,
    lines: (raw.lines ?? []).map(mapLine),
  };
}

/** One posted journal entry as the API embeds it under a bill/invoice — display-only. */
export interface EmbeddedJournalEntry {
  id: number;
  journal_id: number;
  lines: { account_name: string; debit: number; credit: number }[];
}

function mapEmbeddedJournalEntry(raw: Raw | null): EmbeddedJournalEntry | null {
  if (!raw) return null;
  return {
    id: raw.id,
    journal_id: raw.journal_id,
    lines: (raw.lines ?? []).map((line: Raw) => ({
      account_name: line.account ? `${line.account.code} · ${line.account.name}` : "—",
      debit: num(line.debit),
      credit: num(line.credit),
    })),
  };
}

/** Extra, read-only fields the show endpoint carries that the list endpoint doesn't. */
export interface VendorBillDetail extends VendorBill {
  contact_name: string;
  purchase_order_number: string | null;
  amount_due: number;
  journal_entry: EmbeddedJournalEntry | null;
}

export interface CustomerInvoiceDetail extends CustomerInvoice {
  contact_name: string;
  sales_order_number: string | null;
  amount_due: number;
  journal_entry: EmbeddedJournalEntry | null;
}

export function mapVendorBillDetail(raw: Raw): VendorBillDetail {
  return {
    ...mapVendorBill(raw),
    contact_name: raw.contact?.name ?? "—",
    purchase_order_number: raw.purchase_order?.number ?? null,
    amount_due: num(raw.amount_due),
    journal_entry: mapEmbeddedJournalEntry(raw.journal_entry),
  };
}

export function mapCustomerInvoiceDetail(raw: Raw): CustomerInvoiceDetail {
  return {
    ...mapCustomerInvoice(raw),
    contact_name: raw.contact?.name ?? "—",
    sales_order_number: raw.sales_order?.number ?? null,
    amount_due: num(raw.amount_due),
    journal_entry: mapEmbeddedJournalEntry(raw.journal_entry),
  };
}

export function mapCustomerInvoice(raw: Raw): CustomerInvoice {
  return {
    id: raw.id,
    sales_order_id: raw.sales_order_id,
    contact_id: raw.contact_id,
    invoice_number: raw.invoice_number,
    invoice_reference: raw.invoice_reference,
    invoice_date: raw.invoice_date,
    due_date: raw.due_date,
    status: raw.status,
    total: num(raw.total),
    amount_paid: num(raw.amount_paid),
    journal_entry_id: raw.journal_entry_id,
    lines: (raw.lines ?? []).map(mapLine),
  };
}

export function mapPayment(raw: Raw): Payment {
  return {
    id: raw.id,
    contact_id: raw.contact_id,
    payment_type: raw.payment_type,
    payable_type: raw.payable_type,
    payable_id: raw.payable_id,
    payment_via: raw.payment_via,
    journal_id: raw.journal_id,
    amount: num(raw.amount),
    date: raw.date,
    note: raw.note,
  };
}

function mapAccountGroup(raw: Raw): ReportAccountGroup {
  return {
    accounts: (raw.accounts ?? []).map((a: Raw) => ({ account: a.name, balance: num(a.balance) })),
    total: num(raw.total),
  };
}

export function mapBalanceSheet(raw: Raw): BalanceSheet {
  return {
    as_of: raw.as_of,
    assets: mapAccountGroup(raw.assets),
    liabilities: mapAccountGroup(raw.liabilities),
    capital: { ...mapAccountGroup(raw.capital), retained_earnings: num(raw.capital.retained_earnings) },
    total_assets: num(raw.total_assets),
    total_liabilities_and_capital: num(raw.total_liabilities_and_capital),
    balanced: raw.balanced,
  };
}

export function mapProfitAndLoss(raw: Raw): ProfitAndLoss {
  return {
    period: raw.period,
    income: mapAccountGroup(raw.income),
    purchase_expense: mapAccountGroup(raw.purchase_expense),
    other_expense: mapAccountGroup(raw.other_expense),
    total_income: num(raw.total_income),
    total_expenses: num(raw.total_expenses),
    net_income: num(raw.net_income),
  };
}
