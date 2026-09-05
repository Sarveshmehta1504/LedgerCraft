"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { formatMoney, today } from "@/lib/format";
import { MOCK_CONTACTS } from "@/lib/mock-data";
import type { DocumentLine, PurchaseOrder, SalesOrder } from "@/types";

type Side = "purchase" | "sales";

/** Purchase lines default to the Purchase Expense account, sales lines to Sale Income. */
const DEFAULT_ACCOUNT: Record<Side, number> = { purchase: 9, sales: 8 };

const COPY = {
  purchase: {
    title: "Purchase Order",
    listHref: "/purchases",
    partnerLabel: "Vendor",
    convertLabel: "Convert to Bill",
    convertHref: "/bills",
    partnerTypes: ["vendor", "both"],
    confirmedStatus: "confirmed" as const,
    convertedStatus: "billed" as const,
  },
  sales: {
    title: "Sales Order",
    listHref: "/sales",
    partnerLabel: "Customer",
    convertLabel: "Convert to Invoice",
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

  const [contactId, setContactId] = useState<number | null>(order?.contact_id ?? null);
  const [date, setDate] = useState(order?.date ?? today());
  const [status, setStatus] = useState<string>(order?.status ?? "draft");
  const [lines, setLines] = useState<DocumentLine[]>(
    order?.lines ?? [blankDocumentLine(DEFAULT_ACCOUNT[side])],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const isDraft = status === "draft";
  const isConfirmed = status === "confirmed";
  const total = documentTotal(lines, withTax);

  const partnerOptions = MOCK_CONTACTS.filter((contact) =>
    copy.partnerTypes.includes(contact.type),
  ).map((contact) => ({ value: contact.id, label: contact.name }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (contactId === null) next.contact_id = `Select a ${copy.partnerLabel.toLowerCase()}.`;
    if (lines.length === 0 || total <= 0) next.lines = "Add at least one line with a value.";
    if (lines.some((line) => line.product_id === null)) next.lines = "Every line needs a product.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function run(action: "save" | "confirm" | "convert") {
    if (!validate()) return;
    setBusy(true);
    // TODO: replace with real API once backend/<purchase|sales> is ready
    // (POST /api/{purchase-orders|sales-orders}, /confirm, /convert-to-bill|invoice).
    await new Promise((resolve) => setTimeout(resolve, 420));
    setBusy(false);

    if (action === "confirm") {
      setStatus(copy.confirmedStatus);
      return;
    }
    if (action === "convert") {
      setStatus(copy.convertedStatus);
      router.push(copy.convertHref);
      return;
    }
    router.push(copy.listHref);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <PageHeader
        title={order ? `${copy.title} #${order.id}` : `New ${copy.title.toLowerCase()}`}
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
        defaultAccountId={DEFAULT_ACCOUNT[side]}
        priceField={side === "sales" ? "sales_price" : "cost_price"}
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
