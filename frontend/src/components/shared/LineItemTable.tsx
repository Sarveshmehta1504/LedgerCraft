"use client";

import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { ComboboxControl } from "@/components/ui/Combobox";
import type { AnalyticAccount, ChartOfAccount, DocumentLine, Product } from "@/types";

/**
 * The line grid shared by Purchase Order, Vendor Bill, Sales Order and Customer
 * Invoice — the board's `Sr. No. | Product | Chart of Account | Budget Analytics |
 * Qty | Unit Price | Total`. Tax is sales-side only, so the column is opt-in.
 */

export function lineSubtotal(line: DocumentLine): number {
  return (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
}

export function lineTotal(line: DocumentLine, withTax: boolean): number {
  const subtotal = lineSubtotal(line);
  if (!withTax) return subtotal;
  return subtotal * (1 + (Number(line.tax_percent) || 0) / 100);
}

export function documentTotal(lines: DocumentLine[], withTax: boolean): number {
  return lines.reduce((sum, line) => sum + lineTotal(line, withTax), 0);
}

export function blankDocumentLine(defaultAccountId: number | null): DocumentLine {
  return {
    id: `line-${Math.random().toString(36).slice(2, 9)}`,
    product_id: null,
    account_id: defaultAccountId,
    analytic_account_id: null,
    quantity: 1,
    unit_price: 0,
    tax_percent: 0,
  };
}

/** How a locked cell prints its value: same row rhythm, no control chrome. */
const cellText = "block py-1 text-[13px] text-[var(--text)]";

const cellNumberText = "tnum block py-1 text-right font-mono text-[13px] text-[var(--text)]";

const cellNumber =
  "tnum h-8 w-full rounded border border-[var(--line-strong)] bg-white px-2 text-right font-mono text-[13px] " +
  "focus:outline-2 focus:-outline-offset-1 focus:outline-[var(--accent)] " +
  "disabled:bg-[var(--surface-raised)]";

interface LineItemTableProps {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  /** Sales documents carry tax; purchase documents do not (per the problem statement). */
  withTax?: boolean;
  readOnly?: boolean;
  defaultAccountId: number | null;
  /** Price column follows the document side: sales price vs cost price. */
  priceField?: "sales_price" | "cost_price";
  /** Real products and accounts — analytic accounts stay mocked, no backend route exists yet. */
  products: Product[];
  accounts: ChartOfAccount[];
  analyticAccounts?: AnalyticAccount[];
}

export function LineItemTable({
  lines,
  onChange,
  withTax = false,
  readOnly = false,
  defaultAccountId,
  priceField = "sales_price",
  products,
  accounts,
  analyticAccounts = [],
}: LineItemTableProps) {
  // A locked document shows its values as text — a disabled dropdown still reads
  // as an input the user might be able to change, which it is not.
  const nameOf = <T extends { id: number; name: string }>(list: T[], id: number | null) =>
    (id === null ? undefined : list.find((item) => item.id === id)?.name) ?? "—";
  const accountLabel = (id: number | null) => {
    const account = id === null ? undefined : accounts.find((item) => item.id === id);
    return account ? `${account.code} · ${account.name}` : "—";
  };

  // Built once, not per row: a ten-line document would otherwise rebuild the
  // same three lists thirty times on every keystroke.
  const productOptions = products.map((product) => ({ value: product.id, label: product.name }));
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
  }));
  const analyticOptions = analyticAccounts.map((analytic) => ({
    value: analytic.id,
    label: analytic.name,
  }));

  function update(id: string, patch: Partial<DocumentLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function onProductChange(id: string, productId: number | null) {
    const product = products.find((item) => item.id === productId);
    update(id, {
      product_id: productId,
      // Picking a product prefills its price — the user can still override it.
      unit_price: product ? product[priceField] : 0,
    });
  }

  const total = documentTotal(lines, withTax);

  return (
    <div>
      <div className="overflow-x-auto border-t border-[var(--line)]">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-sunken)]">
              <th scope="col" className="w-10 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                #
              </th>
              {["Product", "Chart of Account", "Budget Analytics"].map((header) => (
                <th key={header} scope="col" className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {header}
                </th>
              ))}
              {["Qty", "Unit Price", ...(withTax ? ["Tax %"] : []), "Total"].map((header) => (
                <th key={header} scope="col" className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {header}
                </th>
              ))}
              <th scope="col" className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className="tnum px-3 py-1.5 font-mono text-[12px] text-[var(--text-subtle)]">
                  {index + 1}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className={cellText}>{nameOf(products, line.product_id)}</span>
                  ) : (
                    <ComboboxControl
                      ariaLabel={`Product on line ${index + 1}`}
                      size="sm"
                      value={line.product_id}
                      onChange={(value) => onProductChange(line.id, value)}
                      options={productOptions}
                      placeholder="Search products…"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className={cellText}>{accountLabel(line.account_id)}</span>
                  ) : (
                    <ComboboxControl
                      ariaLabel={`Account on line ${index + 1}`}
                      size="sm"
                      value={line.account_id}
                      onChange={(value) => update(line.id, { account_id: value })}
                      options={accountOptions}
                      placeholder="Search accounts…"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className={cellText}>
                      {nameOf(analyticAccounts, line.analytic_account_id)}
                    </span>
                  ) : (
                    <ComboboxControl
                      ariaLabel={`Analytic account on line ${index + 1}`}
                      size="sm"
                      value={line.analytic_account_id}
                      onChange={(value) => update(line.id, { analytic_account_id: value })}
                      options={analyticOptions}
                      placeholder="None"
                      clearLabel="None"
                    />
                  )}
                </td>
                <td className="w-20 px-3 py-1.5">
                  {readOnly ? (
                    <span className={cellNumberText}>{line.quantity}</span>
                  ) : (
                    <input
                      aria-label={`Quantity on line ${index + 1}`}
                      type="number"
                      min={0}
                      step="1"
                      className={cellNumber}
                      value={line.quantity}
                      onChange={(event) => update(line.id, { quantity: Number(event.target.value) })}
                    />
                  )}
                </td>
                <td className="w-28 px-3 py-1.5">
                  {readOnly ? (
                    <span className={cellNumberText}>{formatMoney(line.unit_price)}</span>
                  ) : (
                    <input
                      aria-label={`Unit price on line ${index + 1}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className={cellNumber}
                      value={line.unit_price}
                      onChange={(event) => update(line.id, { unit_price: Number(event.target.value) })}
                    />
                  )}
                </td>
                {withTax && (
                  <td className="w-20 px-3 py-1.5">
                    {readOnly ? (
                      <span className={cellNumberText}>{line.tax_percent ?? 0}</span>
                    ) : (
                      <input
                        aria-label={`Tax percent on line ${index + 1}`}
                        type="number"
                        min={0}
                        step="0.01"
                        className={cellNumber}
                        value={line.tax_percent ?? 0}
                        onChange={(event) =>
                          update(line.id, { tax_percent: Number(event.target.value) })
                        }
                      />
                    )}
                  </td>
                )}
                <td className="tnum w-32 px-3 py-1.5 text-right font-mono text-[13px]">
                  {formatMoney(lineTotal(line, withTax))}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {!readOnly && lines.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => onChange(lines.filter((item) => item.id !== line.id))}
                      className="inline-grid h-6 w-6 cursor-pointer place-items-center rounded text-[var(--text-subtle)] transition-colors duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--danger)]"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line-strong)] bg-[var(--surface-sunken)]">
              <td colSpan={withTax ? 7 : 6} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Total
              </td>
              <td className="tnum px-3 py-2.5 text-right font-mono text-[13px] font-semibold">
                {formatMoney(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="p-5">
          <Button
            size="sm"
            onClick={() => onChange([...lines, blankDocumentLine(defaultAccountId)])}
          >
            Add line
          </Button>
        </div>
      )}
    </div>
  );
}
