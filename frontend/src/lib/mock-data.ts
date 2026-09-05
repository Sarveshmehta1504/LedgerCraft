/**
 * PLACEHOLDER DATA — NOT REAL RECORDS.
 *
 * The backend currently exposes only GET /api/health (verified against
 * backend/routes/api.php). Every collection below stands in for an endpoint that
 * does not exist yet. Each consumer carries its own TODO marker naming the
 * module it is waiting on; delete this file once the API is live.
 */

import type {
  AnalyticAccount,
  Budget,
  ChartOfAccount,
  Contact,
  CustomerInvoice,
  Journal,
  JournalEntry,
  Product,
  ProductCategory,
  PurchaseOrder,
  SalesOrder,
  VendorBill,
} from "@/types";

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 1,
    name: "Rahul Bhatnagar Timbers",
    type: "vendor",
    email: "accounts@bhatnagartimbers.in",
    mobile: "+91 98214 47301",
    address_street: "Plot 14, Kirti Nagar Timber Market",
    address_city: "New Delhi",
    address_state: "Delhi",
    address_country: "India",
    address_pin: "110015",
    profile_image: null,
  },
  {
    id: 2,
    name: "Meghna Rathore Interiors",
    type: "customer",
    email: "meghna@rathoreinteriors.co.in",
    mobile: "+91 90042 18876",
    address_street: "3rd Floor, Lakeview Chambers",
    address_city: "Udaipur",
    address_state: "Rajasthan",
    address_country: "India",
    address_pin: "313001",
    profile_image: null,
  },
  {
    id: 3,
    name: "Verma Upholstery Works",
    type: "both",
    email: "contact@vermaupholstery.in",
    mobile: "+91 87654 20194",
    address_street: "Shed 7, Peenya Industrial Area",
    address_city: "Bengaluru",
    address_state: "Karnataka",
    address_country: "India",
    address_pin: "560058",
    profile_image: null,
  },
  {
    id: 4,
    name: "Aarav Deshmukh",
    type: "customer",
    email: "aarav.deshmukh@fastmail.in",
    mobile: "+91 99873 55210",
    address_street: "B-402, Sunbreeze Residency",
    address_city: "Pune",
    address_state: "Maharashtra",
    address_country: "India",
    address_pin: "411045",
    profile_image: null,
  },
  {
    id: 5,
    name: "Sundaram Hardware & Fittings",
    type: "vendor",
    email: "sales@sundaramfittings.com",
    mobile: "+91 76109 33427",
    address_street: "22 Mount Road",
    address_city: "Chennai",
    address_state: "Tamil Nadu",
    address_country: "India",
    address_pin: "600002",
    profile_image: null,
  },
];

export const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 1, name: "Seating", parent_id: null },
  { id: 2, name: "Tables", parent_id: null },
  { id: 3, name: "Storage", parent_id: null },
  { id: 4, name: "Raw Material", parent_id: null },
  { id: 5, name: "Hardware", parent_id: 4 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: "Aravalli Lounge Chair", type: "goods", sales_price: 18400, cost_price: 11250, category_id: 1 },
  { id: 2, name: "Kadam Dining Table 6-Seater", type: "goods", sales_price: 42750, cost_price: 27900, category_id: 2 },
  { id: 3, name: "Nilgiri Sideboard", type: "goods", sales_price: 31600, cost_price: 19800, category_id: 3 },
  { id: 4, name: "Teak Plank 8ft", type: "goods", sales_price: 4250, cost_price: 2870, category_id: 4 },
  { id: 5, name: "Soft-Close Hinge Set", type: "goods", sales_price: 640, cost_price: 385, category_id: 5 },
  { id: 6, name: "On-Site Assembly", type: "service", sales_price: 2500, cost_price: 900, category_id: 1 },
];

export const MOCK_ACCOUNTS: ChartOfAccount[] = [
  { id: 1, code: "1000", name: "Cash", type: "cash" },
  { id: 2, code: "1010", name: "Bank — HDFC Current", type: "bank" },
  { id: 3, code: "1100", name: "Debtors / Accounts Receivable", type: "asset" },
  { id: 4, code: "1200", name: "Inventory", type: "asset" },
  { id: 5, code: "2000", name: "Creditors / Accounts Payable", type: "liability" },
  { id: 6, code: "2100", name: "GST Payable", type: "liability" },
  { id: 7, code: "3000", name: "Owner's Capital", type: "capital" },
  { id: 8, code: "4000", name: "Sale Income", type: "income" },
  { id: 9, code: "5000", name: "Purchase Expense", type: "expense" },
  { id: 10, code: "5100", name: "Freight & Delivery", type: "expense" },
  { id: 11, code: "6000", name: "Workshop Rent", type: "other_expense" },
];

export const MOCK_JOURNALS: Journal[] = [
  { id: 1, name: "Sales Journal", type: "sales", default_debit_account: 3, default_credit_account: 8 },
  { id: 2, name: "Purchase Journal", type: "purchase", default_debit_account: 9, default_credit_account: 5 },
  { id: 3, name: "Bank Journal", type: "bank", default_debit_account: 2, default_credit_account: 2 },
  { id: 4, name: "Cash Journal", type: "cash", default_debit_account: 1, default_credit_account: 1 },
];

export const MOCK_ANALYTIC_ACCOUNTS: AnalyticAccount[] = [
  { id: 1, name: "Retail Showroom", type: "income" },
  { id: 2, name: "Contract Projects", type: "income" },
  { id: 3, name: "Workshop Operations", type: "expense" },
  { id: 4, name: "Logistics", type: "expense" },
];

export const MOCK_BUDGETS: Budget[] = [
  {
    id: 1,
    name: "Workshop Operations — Q3 FY26",
    analytic_account_id: 3,
    period_start: "2026-07-01",
    period_end: "2026-09-30",
    committed_amount: 450000,
    actual_amount: 317400,
    responsible_id: 3,
    status: "confirmed",
    revision_of_id: null,
  },
  {
    id: 2,
    name: "Contract Projects Revenue — Q3 FY26",
    analytic_account_id: 2,
    period_start: "2026-07-01",
    period_end: "2026-09-30",
    committed_amount: 1250000,
    actual_amount: 1418250,
    responsible_id: 2,
    status: "confirmed",
    revision_of_id: null,
  },
  {
    id: 3,
    name: "Logistics — Q4 FY26",
    analytic_account_id: 4,
    period_start: "2026-10-01",
    period_end: "2026-12-31",
    committed_amount: 185000,
    actual_amount: 0,
    responsible_id: 5,
    status: "draft",
    revision_of_id: null,
  },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 1,
    journal_id: 2,
    date: "2026-09-01",
    reference: "Bill/2026/0001",
    source_type: "vendor_bill",
    source_id: 1,
    status: "posted",
    total: 30000,
    lines: [
      { id: 1, journal_entry_id: 1, account_id: 9, contact_id: 1, debit: 30000, credit: 0, analytic_account_id: 3, description: "Teak stock" },
      { id: 2, journal_entry_id: 1, account_id: 5, contact_id: 1, debit: 0, credit: 30000, analytic_account_id: null, description: null },
    ],
  },
  {
    id: 2,
    journal_id: 1,
    date: "2026-09-02",
    reference: "INV/2026/0001",
    source_type: "customer_invoice",
    source_id: 1,
    status: "draft",
    total: 10500,
    lines: [
      { id: 3, journal_entry_id: 2, account_id: 3, contact_id: 4, debit: 10500, credit: 0, analytic_account_id: null, description: null },
      { id: 4, journal_entry_id: 2, account_id: 8, contact_id: 4, debit: 0, credit: 10500, analytic_account_id: 1, description: "Lounge chair" },
    ],
  },
];

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 1,
    contact_id: 1,
    date: "2026-08-28",
    status: "billed",
    total: 30000,
    lines: [
      { id: "po1-l1", product_id: 4, account_id: 9, analytic_account_id: 3, quantity: 8, unit_price: 2870 },
      { id: "po1-l2", product_id: 5, account_id: 9, analytic_account_id: 3, quantity: 18, unit_price: 385 },
    ],
  },
  {
    id: 2,
    contact_id: 5,
    date: "2026-09-03",
    status: "confirmed",
    total: 13475,
    lines: [{ id: "po2-l1", product_id: 5, account_id: 9, analytic_account_id: 3, quantity: 35, unit_price: 385 }],
  },
  {
    id: 3,
    contact_id: 3,
    date: "2026-09-04",
    status: "draft",
    total: 8610,
    lines: [{ id: "po3-l1", product_id: 4, account_id: 9, analytic_account_id: 3, quantity: 3, unit_price: 2870 }],
  },
];

export const MOCK_VENDOR_BILLS: VendorBill[] = [
  {
    id: 1,
    purchase_order_id: 1,
    contact_id: 1,
    bill_number: "Bill/2026/0001",
    bill_reference: "BT-26-4417",
    bill_date: "2026-09-01",
    due_date: "2026-09-30",
    status: "posted",
    total: 30000,
    amount_paid: 12000,
    journal_entry_id: 1,
    lines: [
      { id: "vb1-l1", product_id: 4, account_id: 9, analytic_account_id: 3, quantity: 8, unit_price: 2870 },
      { id: "vb1-l2", product_id: 5, account_id: 9, analytic_account_id: 3, quantity: 18, unit_price: 385 },
    ],
  },
  {
    id: 2,
    purchase_order_id: null,
    contact_id: 5,
    bill_number: "Bill/2026/0002",
    bill_reference: null,
    bill_date: "2026-09-04",
    due_date: "2026-10-04",
    status: "draft",
    total: 13475,
    amount_paid: 0,
    journal_entry_id: null,
    lines: [{ id: "vb2-l1", product_id: 5, account_id: 9, analytic_account_id: 3, quantity: 35, unit_price: 385 }],
  },
];

export const MOCK_SALES_ORDERS: SalesOrder[] = [
  {
    id: 1,
    contact_id: 2,
    date: "2026-08-30",
    status: "invoiced",
    total: 89880,
    lines: [
      { id: "so1-l1", product_id: 2, account_id: 8, analytic_account_id: 2, quantity: 2, unit_price: 42750, tax_percent: 5 },
    ],
  },
  {
    id: 2,
    contact_id: 4,
    date: "2026-09-02",
    status: "confirmed",
    total: 19320,
    lines: [
      { id: "so2-l1", product_id: 1, account_id: 8, analytic_account_id: 1, quantity: 1, unit_price: 18400, tax_percent: 5 },
    ],
  },
  {
    id: 3,
    contact_id: 3,
    date: "2026-09-05",
    status: "draft",
    total: 33180,
    lines: [
      { id: "so3-l1", product_id: 3, account_id: 8, analytic_account_id: 1, quantity: 1, unit_price: 31600, tax_percent: 5 },
    ],
  },
];

export const MOCK_CUSTOMER_INVOICES: CustomerInvoice[] = [
  {
    id: 1,
    sales_order_id: 1,
    contact_id: 2,
    invoice_number: "INV/2026/0001",
    invoice_reference: "RI-PO-8842",
    invoice_date: "2026-09-02",
    due_date: "2026-09-17",
    status: "posted",
    total: 89880,
    amount_paid: 40000,
    journal_entry_id: 2,
    lines: [
      { id: "ci1-l1", product_id: 2, account_id: 8, analytic_account_id: 2, quantity: 2, unit_price: 42750, tax_percent: 5 },
    ],
  },
  {
    id: 2,
    sales_order_id: null,
    contact_id: 4,
    invoice_number: "INV/2026/0002",
    invoice_reference: null,
    invoice_date: "2026-09-04",
    due_date: "2026-09-19",
    status: "paid",
    total: 19320,
    amount_paid: 19320,
    journal_entry_id: null,
    lines: [
      { id: "ci2-l1", product_id: 1, account_id: 8, analytic_account_id: 1, quantity: 1, unit_price: 18400, tax_percent: 5 },
    ],
  },
];

/** Simulates network latency so loading states are actually exercised in the demo. */
export function mockRequest<T>(payload: T, delay = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(payload), delay));
}

export function contactName(id: number | null): string {
  if (id === null) return "—";
  return MOCK_CONTACTS.find((contact) => contact.id === id)?.name ?? "—";
}

export function accountName(id: number | null): string {
  if (id === null) return "—";
  const account = MOCK_ACCOUNTS.find((item) => item.id === id);
  return account ? `${account.code} · ${account.name}` : "—";
}

export function productName(id: number | null): string {
  if (id === null) return "—";
  return MOCK_PRODUCTS.find((product) => product.id === id)?.name ?? "—";
}

export function journalName(id: number): string {
  return MOCK_JOURNALS.find((journal) => journal.id === id)?.name ?? "—";
}

export function categoryName(id: number): string {
  return MOCK_CATEGORIES.find((category) => category.id === id)?.name ?? "—";
}

export function analyticName(id: number | null): string {
  if (id === null) return "—";
  return MOCK_ANALYTIC_ACCOUNTS.find((account) => account.id === id)?.name ?? "—";
}
