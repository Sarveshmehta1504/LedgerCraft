<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\CustomerInvoice;
use App\Models\Product;
use App\Models\SalesOrder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Sales Order lifecycle: draft -> confirmed -> invoiced.
 *
 * Mirrors PurchaseOrderService, with two differences: lines carry tax_percent
 * (the PS lists Tax on the Sales Order and omits it from the Purchase Order),
 * and the line account defaults to Sale Income rather than Purchase Expense.
 */
class SalesOrderService
{
    public function __construct(
        private readonly DocumentNumberService $numbers,
    ) {}

    public function create(array $data): SalesOrder
    {
        return DB::transaction(function () use ($data) {
            $order = SalesOrder::create([
                'number' => $this->numbers->salesOrder(),
                'contact_id' => $data['contact_id'],
                'date' => $data['date'],
                'status' => 'draft',
                'total' => 0,
            ]);

            $this->replaceLines($order, $data['lines']);

            return $order->load('lines', 'contact');
        });
    }

    public function update(SalesOrder $order, array $data): SalesOrder
    {
        if (! $order->isDraft()) {
            throw new RuntimeException('Only a draft sales order can be edited');
        }

        return DB::transaction(function () use ($order, $data) {
            $order->fill(array_intersect_key($data, array_flip(['contact_id', 'date'])))->save();

            if (isset($data['lines'])) {
                $this->replaceLines($order, $data['lines']);
            }

            return $order->fresh(['lines', 'contact']);
        });
    }

    public function confirm(SalesOrder $order): SalesOrder
    {
        if ($order->status !== 'draft') {
            throw new RuntimeException("A {$order->status} sales order cannot be confirmed again");
        }

        if ($order->lines()->count() === 0) {
            throw new RuntimeException('A sales order needs at least one line before it can be confirmed');
        }

        $order->status = 'confirmed';
        $order->save();

        return $order->fresh(['lines', 'contact']);
    }

    /**
     * Copies customer, products, prices, quantities and tax onto a new draft
     * invoice and marks the order invoiced.
     */
    public function convertToInvoice(SalesOrder $order): CustomerInvoice
    {
        if ($order->status === 'draft') {
            throw new RuntimeException('Confirm the sales order before generating an invoice');
        }

        if ($order->status === 'invoiced') {
            throw new RuntimeException('This sales order has already been converted to an invoice');
        }

        return DB::transaction(function () use ($order) {
            $invoice = CustomerInvoice::create([
                'invoice_number' => $this->numbers->customerInvoice(),
                'sales_order_id' => $order->id,
                'contact_id' => $order->contact_id,
                'invoice_date' => now()->toDateString(),
                'status' => 'draft',
                'total' => 0,
            ]);

            foreach ($order->lines as $line) {
                $invoice->lines()->create([
                    'product_id' => $line->product_id,
                    'account_id' => $line->account_id,
                    'analytic_account_id' => $line->analytic_account_id,
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    // Tax carries through from the SO line, per the PS.
                    'tax_percent' => $line->tax_percent,
                    'subtotal' => $line->subtotal,
                ]);
            }

            $invoice->recalculateTotal();

            $order->status = 'invoiced';
            $order->save();

            return $invoice->fresh(['lines', 'contact', 'salesOrder']);
        });
    }

    private function replaceLines(SalesOrder $order, array $lines): void
    {
        $order->lines()->delete();

        $salesAccountId = $this->defaultSalesAccountId();

        foreach ($lines as $line) {
            $this->assertProductIsSelectable((int) $line['product_id']);

            $quantity = (float) ($line['quantity'] ?? 0);
            $unitPrice = (float) ($line['unit_price'] ?? 0);

            $order->lines()->create([
                'product_id' => $line['product_id'],
                // Sales-side documents default to the Sale Income account.
                'account_id' => $line['account_id'] ?? $salesAccountId,
                'analytic_account_id' => $line['analytic_account_id'] ?? null,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'tax_percent' => (float) ($line['tax_percent'] ?? 0),
                // subtotal excludes tax; the line total adds it on top.
                'subtotal' => number_format($quantity * $unitPrice, 2, '.', ''),
            ]);
        }

        $order->recalculateTotal();
    }

    private function assertProductIsSelectable(int $productId): void
    {
        $product = Product::find($productId);

        if ($product === null || $product->isArchived()) {
            throw new RuntimeException("Product {$productId} is archived and cannot be added to a new document");
        }
    }

    private function defaultSalesAccountId(): int
    {
        $account = ChartOfAccount::where('type', 'income')->orderBy('code')->first();

        if ($account === null) {
            throw new RuntimeException('No income account is configured - seed the chart of accounts first');
        }

        return $account->id;
    }
}
