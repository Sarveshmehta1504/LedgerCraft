"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InlineAlert } from "@/components/ui/States";
import {
  LineItemTable,
  blankDocumentLine,
  documentTotal,
} from "@/components/shared/LineItemTable";
import { ApiError } from "@/lib/api";
import { formatMoney, today } from "@/lib/format";
import { AccountsApi, ContactsApi, ProductsApi, PurchaseOrdersApi, SalesOrdersApi } from "@/lib/resources";
import { useAsyncData } from "@/lib/use-async-data";
import type { ChartOfAccount, Contact, DocumentLine, Product, PurchaseOrder, SalesOrder } from "@/types";

type Side = "purchase" | "sales";

/** Purchase lines default to the Purchase Expense account, sales lines to Sale Income. */
const DEFAULT_ACCOUNT_CODE: Record<Side, string> = { purchase: "5000", sales: "4000" };

const COPY = {
  purchase: {
    title: "Purchase Order",
    listHref: "/purchases",
    partnerLabel: "Vendor",
    convertLabel: "Create Bill",
    convertHref: "/bills",
    partnerTypes: ["vendor", "both"],
    confirmedStatus: "confirmed" as const,
    convertedStatus: "billed" as const,
  },
  sales: {
    title: "Sales Order",
    listHref: "/sales",
    partnerLabel: "Customer",
    convertLabel: "Create Invoice",
    convertHref: "/invoices",
    partnerTypes: ["customer", "both"],
    confirmedStatus: "confirmed" as const,
    convertedStatus: "invoiced" as const,
  },
};

export function OrderForm({
  side,
  order,
}: {
  side: Side;
  order?: PurchaseOrder | SalesOrder;
}) {
  const router = useRouter();
  const copy = COPY[side];
  const withTax = side === "sales";

  const fetchContacts = useCallback(() => ContactsApi.list(), []);
  const { data: contactsData } = useAsyncData<Contact[]>(fetchContacts, "Could not load contacts.");
  const contacts = contactsData ?? [];

  const fetchProducts = useCallback(() => ProductsApi.list(), []);
  const { data: productsData } = useAsyncData<Product[]>(fetchProducts, "Could not load products.");
  const products = productsData ?? [];

  const fetchAccounts = useCallback(() => AccountsApi.list(), []);
  const { data: accountsData } = useAsyncData<ChartOfAccount[]>(fetchAccounts, "Could not load accounts.");
  const accounts = accountsData ?? [];
  const defaultAccountId = accounts.find((a) => a.code === DEFAULT_ACCOUNT_CODE[side])?.id ?? null;

  const [contactId, setContactId] = useState<number | null>(order?.contact_id ?? null);
  const [date, setDate] = useState(order?.date.slice(0, 10) ?? today());
  const [status, setStatus] = useState<string>(order?.status ?? "draft");
  const [lines, setLines] = useState<DocumentLine[]>(order?.lines ?? []);
  const [linesInitialized, setLinesInitialized] = useState(Boolean(order));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A blank line needs a real default account id, which only exists once accounts have loaded.
  if (!linesInitialized && defaultAccountId !== null) {
    setLines([blankDocumentLine(defaultAccountId)]);
    setLinesInitialized(true);
  }

  const isDraft = status === "draft";
  const isConfirmed = status === "confirmed";
  const total = documentTotal(lines, withTax);

  const partnerOptions = contacts
    .filter((contact) => copy.partnerTypes.includes(contact.type))
    .map((contact) => ({ value: contact.id, label: contact.name }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (contactId === null) next.contact_id = `Select a ${copy.partnerLabel.toLowerCase()}.`;
    if (lines.some((line) => line.product_id === null)) next.lines = "Every line needs a product.";
    if (lines.some((line) => line.quantity <= 0 || line.unit_price < 0))
      next.lines = "Quantity must be greater than zero and price cannot be negative.";
    // A document with nothing on it, or a negative value, must never reach Confirm.
    if (lines.length === 0 || total <= 0)
      next.lines = `A ${copy.title.toLowerCase()} cannot be confirmed with a zero or negative total.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function run(action: "save" | "confirm" | "convert") {
    if (action !== "convert" && !validate()) return;
    setBusy(true);
    setFormError(null);
    try {
      if (action === "confirm" || action === "save") {
        let id = order?.id;
        if (!id) {
          const created =
            side === "purchase"
              ? await PurchaseOrdersApi.create({ contact_id: contactId!, date, lines })
              : await SalesOrdersApi.create({ contact_id: contactId!, date, lines });
          id = created.id;
        } else {
          // Persist whatever was edited before confirming, not just on an explicit Save.
          if (side === "purchase") await PurchaseOrdersApi.update(id, { contact_id: contactId!, date, lines });
          else await SalesOrdersApi.update(id, { contact_id: contactId!, date, lines });
        }
        if (action === "confirm") {
          if (side === "purchase") await PurchaseOrdersApi.confirm(id);
          else await SalesOrdersApi.confirm(id);
          setStatus(copy.confirmedStatus);
          router.push(`${copy.listHref}/${id}`);
          return;
        }
        router.push(`${copy.listHref}/${id}`);
        return;
      }

      // convert
      const created =
        side === "purchase"
          ? await PurchaseOrdersApi.convertToBill(order!.id)
          : await SalesOrdersApi.convertToInvoice(order!.id);
      router.push(`${copy.convertHref}/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : `Could not save this ${copy.title.toLowerCase()}.`);
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={order ? `${copy.title} ${order.number}` : `New ${copy.title.toLowerCase()}`}
        subtitle={copy.title}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="primary" size="sm" onClick={() => run("save")} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" onClick={() => run("confirm")} disabled={busy}>
                  Confirm
                </Button>
              </>
            )}
            {isConfirmed && (
              <Button variant="primary" size="sm" onClick={() => run("convert")} disabled={busy}>
                {busy ? "Working…" : copy.convertLabel}
              </Button>
            )}
          </div>
        }
        trailing={
          <>
            <StatusBadge status={status} />
            <Button size="sm" onClick={() => router.push(copy.listHref)}>
              Back
            </Button>
          </>
        }
      />

      {formError && (
        <div className="border-b border-[var(--line)] p-5">
          <InlineAlert title={formError} />
        </div>
      )}

      <div className="grid max-w-2xl gap-5 p-5 md:grid-cols-2">
        <SelectField
          label={copy.partnerLabel}
          value={contactId ?? ""}
          onChange={(event) => setContactId(event.target.value ? Number(event.target.value) : null)}
          options={partnerOptions}
          placeholder={`Select a ${copy.partnerLabel.toLowerCase()}`}
          error={errors.contact_id}
          disabled={!isDraft}
          required
        />
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={!isDraft}
          required
        />
      </div>

      <LineItemTable
        lines={lines}
        onChange={setLines}
        withTax={withTax}
        readOnly={!isDraft}
        defaultAccountId={defaultAccountId}
        priceField={side === "sales" ? "sales_price" : "cost_price"}
        products={products}
        accounts={accounts}
      />

      <div className="flex flex-col gap-3 border-t border-[var(--line)] p-5">
        {errors.lines && <InlineAlert title={errors.lines} />}

        {isConfirmed && (
          <InlineAlert tone="info" title={`Confirmed — ready to convert`}>
            {copy.convertLabel} copies the partner, products, quantities and prices onto the new
            document.
          </InlineAlert>
        )}

        <div className="flex justify-end">
          <div className="w-64 border-t-2 border-[var(--line-strong)] pt-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Order total
              </span>
              <span className="tnum font-mono text-[15px] font-semibold text-[var(--text)]">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
