/**
 * Thin, typed wrappers around apiFetch for each resource the frontend now
 * talks to for real. Each list/get/create/update runs its raw JSON through
 * the matching mapper in lib/normalize.ts before handing it to a component.
 */

import { apiFetch, downloadFile } from "./api";
import {
  mapAccount,
  mapAnalyticAccount,
  mapBalanceSheet,
  mapBudget,
  mapBudgetReport,
  mapContact,
  mapCustomerInvoice,
  mapCustomerInvoiceDetail,
  mapJournal,
  mapJournalEntry,
  mapManagedUser,
  mapPayment,
  mapPortalInvoice,
  mapProduct,
  mapProductCategory,
  mapProfitAndLoss,
  mapPurchaseOrder,
  mapSalesOrder,
  mapVendorBill,
  mapVendorBillDetail,
} from "./normalize";
export type { VendorBillDetail, CustomerInvoiceDetail, PortalInvoice, PortalInvoiceLine } from "./normalize";
import type { AnalyticAccountType, BudgetReport, ChartOfAccount, Contact, ContactType, DocumentLine, Journal, JournalType, PaymentVia, Product, ProductType, Role } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

/** The line shape every create/update call sends — the id fields, not the resolved relations. */
function toLinePayload(line: DocumentLine) {
  return {
    product_id: line.product_id,
    account_id: line.account_id,
    analytic_account_id: line.analytic_account_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
    ...(line.tax_percent !== undefined ? { tax_percent: line.tax_percent } : {}),
  };
}

/**
 * Admin-only user directory. The backend guards every one of these with
 * UserPolicy, and this is the only route by which an admin or accountant
 * account can be created — signup always produces a portal `user`.
 */
export const UsersApi = {
  list: (params?: { search?: string; role?: Role; deactivated?: "only" }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.role) query.set("role", params.role);
    if (params?.deactivated) query.set("deactivated", params.deactivated);
    const suffix = query.toString() ? `?${query}` : "";
    return apiFetch<Raw[]>(`/users${suffix}`).then((rows) => rows.map(mapManagedUser));
  },
  create: (input: {
    name: string;
    login_id: string;
    email: string;
    password: string;
    role: Role;
    contact_id?: number | null;
  }) => apiFetch<Raw>("/users", { method: "POST", body: JSON.stringify(input) }).then(mapManagedUser),
  assignRole: (id: number, role: Role, contactId?: number | null) =>
    apiFetch<Raw>(`/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role, contact_id: contactId ?? null }),
    }).then(mapManagedUser),
  /** Deactivate, not delete — the backend also revokes the account's tokens. */
  deactivate: (id: number) =>
    apiFetch<Raw>(`/users/${id}`, { method: "DELETE" }).then(mapManagedUser),
  reactivate: (id: number) =>
    apiFetch<Raw>(`/users/${id}/reactivate`, { method: "PATCH" }).then(mapManagedUser),
};

/**
 * Contact portal. Scope comes from the signed-in user's contact_id server-side,
 * so these are the only endpoints a `user` role can reach — every back-office
 * route returns 403 for them.
 */
export const PortalApi = {
  invoices: () => apiFetch<Raw[]>("/my/invoices").then((rows) => rows.map(mapCustomerInvoice)),
  bills: () => apiFetch<Raw[]>("/my/bills").then((rows) => rows.map(mapVendorBill)),
  invoice: (id: number) => apiFetch<Raw>(`/my/invoices/${id}`).then(mapPortalInvoice),
  /**
   * The customer settling their own invoice; the server re-checks ownership.
   * The pay response carries only a summary — no lines, no contact — so the
   * full record is re-read rather than letting the screen lose its detail.
   */
  pay: async (id: number, input: { amount: number; payment_via?: PaymentVia; note?: string }) => {
    await apiFetch<{ payment: Raw; invoice: Raw }>(`/my/invoices/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return apiFetch<Raw>(`/my/invoices/${id}`).then(mapPortalInvoice);
  },
  /**
   * The server-rendered PDF and the emailed copy of the customer's own
   * invoice. Both sit under `/my` so the scope comes from the session rather
   * than the request, exactly like the reads above.
   *
   * These two routes do not exist yet — the staff equivalents are 403 for this
   * role — so callers must handle a 404 and fall back. See PortalInvoicePage.
   */
  pdf: (id: number, number: string) =>
    downloadFile(`/my/invoices/${id}/pdf`, `${number.replace(/\//g, "-")}.pdf`),
  /** No recipient: the API mails the contact this account is linked to. */
  send: (id: number) => apiFetch<null>(`/my/invoices/${id}/send`, { method: "POST" }),
};

export const AnalyticAccountsApi = {
  list: () => apiFetch<Raw[]>("/analytic-accounts").then((rows) => rows.map(mapAnalyticAccount)),
  get: (id: number) => apiFetch<Raw>(`/analytic-accounts/${id}`).then(mapAnalyticAccount),
  create: (input: { name: string; type: AnalyticAccountType }) =>
    apiFetch<Raw>("/analytic-accounts", { method: "POST", body: JSON.stringify(input) }).then(
      mapAnalyticAccount,
    ),
  update: (id: number, input: { name: string; type: AnalyticAccountType }) =>
    apiFetch<Raw>(`/analytic-accounts/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(
      mapAnalyticAccount,
    ),
  remove: (id: number) => apiFetch<Raw>(`/analytic-accounts/${id}`, { method: "DELETE" }),
};

export const BudgetsApi = {
  list: () => apiFetch<Raw[]>("/budgets").then((rows) => rows.map(mapBudget)),
  get: (id: number) => apiFetch<Raw>(`/budgets/${id}`).then(mapBudget),
  create: (input: {
    name: string;
    analytic_account_id: number;
    period_start: string;
    period_end: string;
    committed_amount: number;
    responsible_id: number | null;
  }) => apiFetch<Raw>("/budgets", { method: "POST", body: JSON.stringify(input) }).then(mapBudget),
  update: (
    id: number,
    input: {
      name: string;
      analytic_account_id: number;
      period_start: string;
      period_end: string;
      committed_amount: number;
      responsible_id: number | null;
    },
  ) => apiFetch<Raw>(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(mapBudget),
  remove: (id: number) => apiFetch<Raw>(`/budgets/${id}`, { method: "DELETE" }),
  confirm: (id: number) =>
    apiFetch<Raw>(`/budgets/${id}/confirm`, { method: "POST" }).then(mapBudget),
  cancel: (id: number) => apiFetch<Raw>(`/budgets/${id}/cancel`, { method: "POST" }).then(mapBudget),
  /** Moves the original to `revised` and returns the new draft linked back to it. */
  revise: (id: number, input?: Partial<{ name: string; committed_amount: number }>) =>
    apiFetch<Raw>(`/budgets/${id}/revise`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }).then(mapBudget),
};

/** Read-only: the ledger is written by the system when documents are posted. */
export const JournalEntriesApi = {
  list: () => apiFetch<Raw[]>("/journal-entries").then((rows) => rows.map(mapJournalEntry)),
  get: (id: number) => apiFetch<Raw>(`/journal-entries/${id}`).then(mapJournalEntry),
};

export const ContactsApi = {
  list: () => apiFetch<Raw[]>("/contacts").then((rows) => rows.map(mapContact)),
  get: (id: number) => apiFetch<Raw>(`/contacts/${id}`).then(mapContact),
  create: (input: {
    name: string;
    type: ContactType;
    email?: string | null;
    mobile?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    address_country?: string | null;
    address_pin?: string | null;
    /** Path returned by /api/uploads — the API stores the string, not the file. */
    profile_image?: string | null;
  }) => apiFetch<Raw>("/contacts", { method: "POST", body: JSON.stringify(input) }).then(mapContact),
  update: (id: number, input: Partial<Contact>) =>
    apiFetch<Raw>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(mapContact),
};

export const ProductCategoriesApi = {
  list: () => apiFetch<Raw[]>("/product-categories").then((rows) => rows.map(mapProductCategory)),
  create: (name: string) =>
    apiFetch<Raw>("/product-categories", { method: "POST", body: JSON.stringify({ name }) }).then(
      mapProductCategory,
    ),
};

export const ProductsApi = {
  list: () => apiFetch<Raw[]>("/products").then((rows) => rows.map(mapProduct)),
  get: (id: number) => apiFetch<Raw>(`/products/${id}`).then(mapProduct),
  create: (input: {
    name: string;
    type: ProductType;
    sales_price: number;
    cost_price: number;
    category_id: number;
  }) => apiFetch<Raw>("/products", { method: "POST", body: JSON.stringify(input) }).then(mapProduct),
  update: (id: number, input: Partial<Product>) =>
    apiFetch<Raw>(`/products/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(mapProduct),
};

export const AccountsApi = {
  list: () => apiFetch<Raw[]>("/accounts").then((rows) => rows.map(mapAccount)),
  get: (id: number) => apiFetch<Raw>(`/accounts/${id}`).then(mapAccount),
  create: (input: { code: string; name: string; type: string }) =>
    apiFetch<Raw>("/accounts", { method: "POST", body: JSON.stringify(input) }).then(mapAccount),
  update: (id: number, input: Partial<ChartOfAccount>) =>
    apiFetch<Raw>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(mapAccount),
};

export const JournalsApi = {
  list: () => apiFetch<Raw[]>("/journals").then((rows) => rows.map(mapJournal)),
  get: (id: number) => apiFetch<Raw>(`/journals/${id}`).then(mapJournal),
  create: (input: {
    name: string;
    type: JournalType;
    default_debit_account: number | null;
    default_credit_account: number | null;
  }) => apiFetch<Raw>("/journals", { method: "POST", body: JSON.stringify(input) }).then(mapJournal),
  update: (id: number, input: Partial<Journal>) =>
    apiFetch<Raw>(`/journals/${id}`, { method: "PUT", body: JSON.stringify(input) }).then(mapJournal),
};

export const PurchaseOrdersApi = {
  list: () => apiFetch<Raw[]>("/purchase-orders").then((rows) => rows.map(mapPurchaseOrder)),
  get: (id: number) => apiFetch<Raw>(`/purchase-orders/${id}`).then(mapPurchaseOrder),
  create: (input: { contact_id: number; date: string; lines: DocumentLine[] }) =>
    apiFetch<Raw>("/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ ...input, lines: input.lines.map(toLinePayload) }),
    }).then(mapPurchaseOrder),
  update: (id: number, input: { contact_id: number; date: string; lines: DocumentLine[] }) =>
    apiFetch<Raw>(`/purchase-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...input, lines: input.lines.map(toLinePayload) }),
    }).then(mapPurchaseOrder),
  confirm: (id: number) =>
    apiFetch<Raw>(`/purchase-orders/${id}/confirm`, { method: "POST" }).then(mapPurchaseOrder),
  convertToBill: (id: number) =>
    apiFetch<Raw>(`/purchase-orders/${id}/convert-to-bill`, { method: "POST" }).then(mapVendorBill),
};

export const VendorBillsApi = {
  list: () => apiFetch<Raw[]>("/vendor-bills").then((rows) => rows.map(mapVendorBill)),
  get: (id: number) => apiFetch<Raw>(`/vendor-bills/${id}`).then(mapVendorBillDetail),
  post: (id: number) => apiFetch<Raw>(`/vendor-bills/${id}/post`, { method: "POST" }).then(mapVendorBillDetail),
  pdf: (id: number, number: string) =>
    downloadFile(`/vendor-bills/${id}/pdf`, `${number.replace(/\//g, "-")}.pdf`),
  /** Omitting `to` lets the API fall back to the vendor's own email. */
  send: (id: number, to?: string) =>
    apiFetch<null>(`/vendor-bills/${id}/send`, {
      method: "POST",
      body: JSON.stringify(to ? { to } : {}),
    }),
  registerPayment: (id: number, input: { amount: number; payment_via: PaymentVia; date?: string; note?: string }) =>
    apiFetch<{ payment: Raw; bill: Raw }>(`/vendor-bills/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((res) => ({ payment: mapPayment(res.payment), bill: mapVendorBillDetail(res.bill) })),
};

export const SalesOrdersApi = {
  list: () => apiFetch<Raw[]>("/sales-orders").then((rows) => rows.map(mapSalesOrder)),
  get: (id: number) => apiFetch<Raw>(`/sales-orders/${id}`).then(mapSalesOrder),
  create: (input: { contact_id: number; date: string; lines: DocumentLine[] }) =>
    apiFetch<Raw>("/sales-orders", {
      method: "POST",
      body: JSON.stringify({ ...input, lines: input.lines.map(toLinePayload) }),
    }).then(mapSalesOrder),
  update: (id: number, input: { contact_id: number; date: string; lines: DocumentLine[] }) =>
    apiFetch<Raw>(`/sales-orders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...input, lines: input.lines.map(toLinePayload) }),
    }).then(mapSalesOrder),
  confirm: (id: number) => apiFetch<Raw>(`/sales-orders/${id}/confirm`, { method: "POST" }).then(mapSalesOrder),
  convertToInvoice: (id: number) =>
    apiFetch<Raw>(`/sales-orders/${id}/convert-to-invoice`, { method: "POST" }).then(mapCustomerInvoice),
};

export const CustomerInvoicesApi = {
  list: () => apiFetch<Raw[]>("/customer-invoices").then((rows) => rows.map(mapCustomerInvoice)),
  get: (id: number) => apiFetch<Raw>(`/customer-invoices/${id}`).then(mapCustomerInvoiceDetail),
  post: (id: number) =>
    apiFetch<Raw>(`/customer-invoices/${id}/post`, { method: "POST" }).then(mapCustomerInvoiceDetail),
  pdf: (id: number, number: string) =>
    downloadFile(`/customer-invoices/${id}/pdf`, `${number.replace(/\//g, "-")}.pdf`),
  /** Omitting `to` lets the API fall back to the customer's own email. */
  send: (id: number, to?: string) =>
    apiFetch<null>(`/customer-invoices/${id}/send`, {
      method: "POST",
      body: JSON.stringify(to ? { to } : {}),
    }),
  registerPayment: (id: number, input: { amount: number; payment_via: PaymentVia; date?: string; note?: string }) =>
    apiFetch<{ payment: Raw; invoice: Raw }>(`/customer-invoices/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((res) => ({ payment: mapPayment(res.payment), invoice: mapCustomerInvoiceDetail(res.invoice) })),
};

/** The three reports the API will render; anything else is a 404 by design. */
export type ReportName = "balance-sheet" | "profit-and-loss" | "budget";

/** Period selection, passed straight through to the PDF and mail routes. */
export interface ReportParams {
  as_of?: string;
  from?: string;
  to?: string;
}

function reportQuery(params?: ReportParams): string {
  const query = new URLSearchParams();
  if (params?.as_of) query.set("as_of", params.as_of);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  return query.toString() ? `?${query}` : "";
}

export const ReportsApi = {
  balanceSheet: (asOf?: string) =>
    apiFetch<Raw>(`/reports/balance-sheet${asOf ? `?as_of=${asOf}` : ""}`).then(mapBalanceSheet),
  profitAndLoss: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return apiFetch<Raw>(`/reports/profit-and-loss${qs}`).then(mapProfitAndLoss);
  },
  /** Downloads the report as a PDF, with the same period the screen is showing. */
  pdf: (report: ReportName, params?: ReportParams) =>
    downloadFile(`/reports/${report}/pdf${reportQuery(params)}`, `${report}.pdf`),
  /** Mails the report. A report has no contact of its own, so `to` is required. */
  send: (report: ReportName, to: string, params?: ReportParams) =>
    apiFetch<null>(`/reports/${report}/send${reportQuery(params)}`, {
      method: "POST",
      body: JSON.stringify({ to }),
    }),
  /**
   * Rows *and* the API's own totals. The totals already leave out superseded
   * and cancelled budgets, so re-summing the rows here would reintroduce the
   * double-counting the backend exists to avoid.
   */
  budget: () => apiFetch<Raw>("/reports/budget").then(mapBudgetReport) as Promise<BudgetReport>,
};
