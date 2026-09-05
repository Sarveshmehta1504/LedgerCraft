<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\VendorBill;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Purchase Order lifecycle: draft -> confirmed -> billed.
 *
 * Line maths and status transitions live here rather than in the controller so
 * the sales side can mirror them and so totals can never drift from lines.
 */
class PurchaseOrderService
{
    public function __construct(
        private readonly DocumentNumberService $numbers,
    ) {}

    /**
     * @param  array{contact_id:int, date:mixed, lines:array<int, array<string, mixed>>}  $data
     */
    public function create(array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($data) {
            $order = PurchaseOrder::create([
                'number' => $this->numbers->purchaseOrder(),
                'contact_id' => $data['contact_id'],
                'date' => $data['date'],
                'due_date' => $data['due_date'] ?? null,
                'status' => 'draft',
                'total' => 0,
            ]);

            $this->replaceLines($order, $data['lines']);

            return $order->load('lines', 'contact');
        });
    }

    /**
     * Only a draft may be edited: once confirmed the document has been agreed
     * with the vendor, and once billed it has a bill hanging off it.
     */
    public function update(PurchaseOrder $order, array $data): PurchaseOrder
    {
        if (! $order->isDraft()) {
            throw new RuntimeException('Only a draft purchase order can be edited');
        }

        return DB::transaction(function () use ($order, $data) {
            $order->fill(array_intersect_key($data, array_flip(['contact_id', 'date', 'due_date'])))->save();

            if (isset($data['lines'])) {
                $this->replaceLines($order, $data['lines']);
            }

            return $order->fresh(['lines', 'contact']);
        });
    }

    public function confirm(PurchaseOrder $order): PurchaseOrder
    {
        if ($order->status !== 'draft') {
            throw new RuntimeException("A {$order->status} purchase order cannot be confirmed again");
        }

        if ($order->lines()->count() === 0) {
            throw new RuntimeException('A purchase order needs at least one line before it can be confirmed');
        }

        $order->status = 'confirmed';
        $order->save();

        return $order->fresh(['lines', 'contact']);
    }

    /**
     * Copies vendor, products, prices and quantities onto a new draft bill and
     * marks the order billed. The bill keeps a link back to its origin, which
     * is what the UI uses to decide whether to show the PO button.
     */
    public function convertToBill(PurchaseOrder $order): VendorBill
    {
        if ($order->status === 'draft') {
            throw new RuntimeException('Confirm the purchase order before converting it to a bill');
        }

        if ($order->status === 'billed') {
            throw new RuntimeException('This purchase order has already been converted to a bill');
        }

        return DB::transaction(function () use ($order) {
            $bill = VendorBill::create([
                'bill_number' => $this->numbers->vendorBill(),
                'purchase_order_id' => $order->id,
                'contact_id' => $order->contact_id,
                'bill_date' => now()->toDateString(),
                // Payment terms are agreed at order time, so they carry across -
                // and a bill with no due date never appears in the aging report.
                'due_date' => $order->due_date?->toDateString(),
                // bill_reference is left empty: it holds the vendor's own
                // invoice number, which they issue when they bill us and which
                // cannot be known at PO time.
                'status' => 'draft',
                'total' => 0,
            ]);

            foreach ($order->lines as $line) {
                $bill->lines()->create([
                    'product_id' => $line->product_id,
                    'account_id' => $line->account_id,
                    'analytic_account_id' => $line->analytic_account_id,
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    'subtotal' => $line->subtotal,
                ]);
            }

            $bill->recalculateTotal();

            $order->status = 'billed';
            $order->save();

            return $bill->fresh(['lines', 'contact', 'purchaseOrder']);
        });
    }

    /**
     * Lines are replaced wholesale rather than diffed: the UI edits the grid as
     * a unit, and a partial diff is a lot of complexity for no visible gain.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function replaceLines(PurchaseOrder $order, array $lines): void
    {
        $order->lines()->delete();

        $purchaseAccountId = $this->defaultPurchaseAccountId();

        foreach ($lines as $line) {
            $this->assertProductIsSelectable((int) $line['product_id']);

            $quantity = (float) ($line['quantity'] ?? 0);
            $unitPrice = (float) ($line['unit_price'] ?? 0);

            $order->lines()->create([
                'product_id' => $line['product_id'],
                // Purchase-side documents default to the Purchase account.
                'account_id' => $line['account_id'] ?? $purchaseAccountId,
                'analytic_account_id' => $line['analytic_account_id'] ?? null,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'subtotal' => number_format($quantity * $unitPrice, 2, '.', ''),
            ]);
        }

        $order->recalculateTotal();
    }

    /**
     * Archived master data must not be selectable in a new transaction, though
     * it still resolves on documents that already reference it.
     */
    private function assertProductIsSelectable(int $productId): void
    {
        $product = Product::find($productId);

        if ($product === null || $product->isArchived()) {
            throw new RuntimeException("Product {$productId} is archived and cannot be added to a new document");
        }
    }

    private function defaultPurchaseAccountId(): int
    {
        $account = ChartOfAccount::where('type', 'expense')->orderBy('code')->first();

        if ($account === null) {
            throw new RuntimeException('No expense account is configured - seed the chart of accounts first');
        }

        return $account->id;
    }
}
