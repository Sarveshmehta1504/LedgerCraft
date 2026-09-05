/**
 * Thin, typed wrappers around apiFetch for each resource the frontend now
 * talks to for real. Each list/get/create/update runs its raw JSON through
 * the matching mapper in lib/normalize.ts before handing it to a component.
 */

import { apiFetch } from "./api";
import {
  mapAccount,
  mapBalanceSheet,
  mapContact,
  mapCustomerInvoice,
  mapCustomerInvoiceDetail,
  mapJournal,
  mapPayment,
  mapProduct,
  mapProductCategory,
  mapProfitAndLoss,
  mapPurchaseOrder,
  mapSalesOrder,
  mapVendorBill,
  mapVendorBillDetail,
} from "./normalize";
export type { VendorBillDetail, CustomerInvoiceDetail } from "./normalize";
import type { ChartOfAccount, Contact, ContactType, DocumentLine, Journal, JournalType, PaymentVia, Product, ProductType } from "@/types";

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
  registerPayment: (id: number, input: { amount: number; payment_via: PaymentVia; date?: string; note?: string }) =>
    apiFetch<{ payment: Raw; invoice: Raw }>(`/customer-invoices/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((res) => ({ payment: mapPayment(res.payment), invoice: mapCustomerInvoiceDetail(res.invoice) })),
};

export const ReportsApi = {
  balanceSheet: (asOf?: string) =>
    apiFetch<Raw>(`/reports/balance-sheet${asOf ? `?as_of=${asOf}` : ""}`).then(mapBalanceSheet),
  profitAndLoss: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return apiFetch<Raw>(`/reports/profit-and-loss${qs}`).then(mapProfitAndLoss);
  },
};
