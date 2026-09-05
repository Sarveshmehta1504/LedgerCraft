<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use App\Models\Contact;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Services\PurchaseOrderService;
use App\Services\VendorBillService;
use Illuminate\Database\Seeder;
use RuntimeException;

class PurchaseDemoSeeder extends Seeder
{
    /**
     * Purchase Orders spread across every status the UI needs to render
     * (draft, confirmed, billed - unpaid/partially paid/fully paid), plus two
     * standalone bills (no PO) backdated so the aging report has overdue
     * buckets to show. Everything goes through PurchaseOrderService /
     * VendorBillService - never a raw insert - per docs/SEEDING.md.
     *
     * Guarded on PurchaseOrder::exists() so re-running db:seed on a
     * non-fresh database never doubles this demo data up.
     */
    public function run(): void
    {
        if (PurchaseOrder::exists()) {
            return;
        }

        $admin = User::where('login_id', 'adminuser')->firstOrFail();
        $orders = app(PurchaseOrderService::class);
        $bills = app(VendorBillService::class);

        $brightWoods = $this->contact('Bright Woods Timber Co');
        $steelcraft = $this->contact('Steelcraft Hardware Suppliers');
        $ecofab = $this->contact('EcoFab Raw Materials');
        $primeFoam = $this->contact('Prime Foam & Upholstery');
        $apexLogistics = $this->contact('Apex Logistics Partners');
        $trident = $this->contact('Trident Trading Co');

        $teakWood = $this->product('Teak Wood Plank (per sq ft)');
        $upholstery = $this->product('Upholstery Fabric (per meter)');
        $hinges = $this->product('Steel Hinges (pack of 50)');
        $officeChair = $this->product('Executive Office Chair');
        $delivery = $this->product('White-Glove Delivery Service');

        $factoryOverheads = AnalyticAccount::where('name', 'Factory Overheads')->first();
        $logistics = AnalyticAccount::where('name', 'Logistics & Delivery')->first();

        // 1. Fully paid, via bank.
        $po = $orders->create([
            'contact_id' => $brightWoods->id,
            'date' => now()->subDays(60)->toDateString(),
            'lines' => [
                ['product_id' => $teakWood->id, 'quantity' => 200, 'unit_price' => 220],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bill = $bills->post($bill, $admin->id);
        $bills->registerPayment($bill, [
            'amount' => $bill->total, 'payment_via' => 'bank', 'date' => now()->subDays(55)->toDateString(),
        ], $admin->id);

        // 2. Partially paid, via cash.
        $po = $orders->create([
            'contact_id' => $steelcraft->id,
            'date' => now()->subDays(50)->toDateString(),
            'lines' => [
                ['product_id' => $hinges->id, 'quantity' => 50, 'unit_price' => 350],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bill = $bills->post($bill, $admin->id);
        $bills->registerPayment($bill, [
            'amount' => 8000, 'payment_via' => 'cash', 'date' => now()->subDays(45)->toDateString(),
        ], $admin->id);

        // 3. Posted, unpaid.
        $po = $orders->create([
            'contact_id' => $ecofab->id,
            'date' => now()->subDays(40)->toDateString(),
            'lines' => [
                ['product_id' => $upholstery->id, 'quantity' => 300, 'unit_price' => 180],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bills->post($bill, $admin->id);

        // 4. Confirmed only - not yet converted to a bill.
        $po = $orders->create([
            'contact_id' => $primeFoam->id,
            'date' => now()->subDays(15)->toDateString(),
            'lines' => [
                ['product_id' => $upholstery->id, 'quantity' => 100, 'unit_price' => 180],
                ['product_id' => $hinges->id, 'quantity' => 20, 'unit_price' => 350],
            ],
        ]);
        $orders->confirm($po);

        // 5. Draft only.
        $orders->create([
            'contact_id' => $brightWoods->id,
            'date' => now()->subDays(5)->toDateString(),
            'lines' => [
                ['product_id' => $teakWood->id, 'quantity' => 150, 'unit_price' => 220],
            ],
        ]);

        // 6. Fully paid, tagged to the Logistics & Delivery analytic account.
        $po = $orders->create([
            'contact_id' => $apexLogistics->id,
            'date' => now()->subDays(30)->toDateString(),
            'lines' => [
                ['product_id' => $delivery->id, 'quantity' => 5, 'unit_price' => 1200, 'analytic_account_id' => $logistics?->id],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bill = $bills->post($bill, $admin->id);
        $bills->registerPayment($bill, [
            'amount' => $bill->total, 'payment_via' => 'bank', 'date' => now()->subDays(25)->toDateString(),
        ], $admin->id);

        // 7. Fully paid, tagged to Factory Overheads.
        $po = $orders->create([
            'contact_id' => $steelcraft->id,
            'date' => now()->subDays(35)->toDateString(),
            'lines' => [
                ['product_id' => $officeChair->id, 'quantity' => 10, 'unit_price' => 3500, 'analytic_account_id' => $factoryOverheads?->id],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bill = $bills->post($bill, $admin->id);
        $bills->registerPayment($bill, [
            'amount' => $bill->total, 'payment_via' => 'bank', 'date' => now()->subDays(30)->toDateString(),
        ], $admin->id);

        // 8. Posted, unpaid - customer is the `both`-type contact.
        $po = $orders->create([
            'contact_id' => $trident->id,
            'date' => now()->subDays(20)->toDateString(),
            'lines' => [
                ['product_id' => $teakWood->id, 'quantity' => 100, 'unit_price' => 220],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bills->post($bill, $admin->id);

        // 9. Fully paid, via cash.
        $po = $orders->create([
            'contact_id' => $ecofab->id,
            'date' => now()->subDays(10)->toDateString(),
            'lines' => [
                ['product_id' => $hinges->id, 'quantity' => 30, 'unit_price' => 350],
            ],
        ]);
        $orders->confirm($po);
        $bill = $orders->convertToBill($po->fresh());
        $bill = $bills->post($bill, $admin->id);
        $bills->registerPayment($bill, [
            'amount' => $bill->total, 'payment_via' => 'cash', 'date' => now()->subDays(8)->toDateString(),
        ], $admin->id);

        // 10. Draft only.
        $orders->create([
            'contact_id' => $brightWoods->id,
            'date' => now()->subDays(2)->toDateString(),
            'lines' => [
                ['product_id' => $teakWood->id, 'quantity' => 80, 'unit_price' => 220],
            ],
        ]);

        // Standalone bills (no PO), backdated overdue - populates the aging
        // report's 31-60/61-90 buckets.
        $overdueBill = $bills->create([
            'contact_id' => $trident->id,
            'bill_date' => now()->subDays(45)->toDateString(),
            'due_date' => now()->subDays(15)->toDateString(),
            'bill_reference' => 'TTC-2026-114',
            'lines' => [
                ['product_id' => $hinges->id, 'quantity' => 40, 'unit_price' => 350],
            ],
        ]);
        $bills->post($overdueBill, $admin->id);

        $overduePartial = $bills->create([
            'contact_id' => $primeFoam->id,
            'bill_date' => now()->subDays(70)->toDateString(),
            'due_date' => now()->subDays(40)->toDateString(),
            'bill_reference' => 'PFU-INV-77120',
            'lines' => [
                ['product_id' => $upholstery->id, 'quantity' => 60, 'unit_price' => 180],
            ],
        ]);
        $overduePartial = $bills->post($overduePartial, $admin->id);
        $bills->registerPayment($overduePartial, [
            'amount' => round(((float) $overduePartial->total) / 2, 2),
            'payment_via' => 'bank',
            'date' => now()->subDays(50)->toDateString(),
        ], $admin->id);
    }

    private function contact(string $name): Contact
    {
        $contact = Contact::where('name', $name)->first();

        if ($contact === null) {
            throw new RuntimeException("Contact '{$name}' not found - run ContactSeeder first");
        }

        return $contact;
    }

    private function product(string $name): Product
    {
        $product = Product::where('name', $name)->first();

        if ($product === null) {
            throw new RuntimeException("Product '{$name}' not found - run ProductSeeder first");
        }

        return $product;
    }
}
