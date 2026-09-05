<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use App\Models\Contact;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\User;
use App\Services\CustomerInvoiceService;
use App\Services\SalesOrderService;
use Illuminate\Database\Seeder;
use RuntimeException;

class SalesDemoSeeder extends Seeder
{
    /**
     * Mirror of PurchaseDemoSeeder on the sales side: every status the UI
     * needs (draft, confirmed, invoiced - unpaid/partial/paid), plus two
     * standalone overdue invoices for the aging report. All through
     * SalesOrderService / CustomerInvoiceService - never a raw insert.
     *
     * Guarded on SalesOrder::exists() so re-running db:seed on a non-fresh
     * database never doubles this demo data up.
     */
    public function run(): void
    {
        if (SalesOrder::exists()) {
            return;
        }

        $admin = User::where('login_id', 'adminuser')->firstOrFail();
        $orders = app(SalesOrderService::class);
        $invoices = app(CustomerInvoiceService::class);

        $nimesh = $this->contact('Nimesh Patel');
        $riya = $this->contact('Riya Mehta');
        $kunal = $this->contact('Kunal Shah');
        $ananya = $this->contact('Ananya Iyer');
        $devika = $this->contact('Devika Rao');
        $rohan = $this->contact('Rohan Verma');
        $trident = $this->contact('Trident Trading Co');

        $sofa = $this->product('3-Seater Fabric Sofa');
        $diningChair = $this->product('Wooden Dining Chair');
        $diningTable = $this->product('4-Seater Dining Table');
        $officeChair = $this->product('Executive Office Chair');
        $lamp = $this->product('LED Reading Lamp');
        $recliner = $this->product('Recliner Lounge Chair');
        $chargingDock = $this->product('Wireless Charging Dock');
        $studyTable = $this->product('Compact Study Table');
        $assembly = $this->product('Furniture Assembly Service');

        $onlineSales = AnalyticAccount::where('name', 'Online Sales Channel')->first();
        $retailShowroom = AnalyticAccount::where('name', 'Retail Showroom')->first();

        // 1. Fully paid, via bank.
        $so = $orders->create([
            'contact_id' => $nimesh->id,
            'date' => now()->subDays(60)->toDateString(),
            'lines' => [
                ['product_id' => $sofa->id, 'quantity' => 1, 'unit_price' => 26500, 'tax_percent' => 18],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoice = $invoices->post($invoice, $admin->id);
        $invoices->registerPayment($invoice, [
            'amount' => $invoice->total, 'payment_via' => 'bank', 'date' => now()->subDays(55)->toDateString(),
        ], $admin->id);

        // 2. Partially paid, via cash.
        $so = $orders->create([
            'contact_id' => $riya->id,
            'date' => now()->subDays(48)->toDateString(),
            'lines' => [
                ['product_id' => $diningChair->id, 'quantity' => 4, 'unit_price' => 2200, 'tax_percent' => 12],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoice = $invoices->post($invoice, $admin->id);
        $invoices->registerPayment($invoice, [
            'amount' => 5000, 'payment_via' => 'cash', 'date' => now()->subDays(44)->toDateString(),
        ], $admin->id);

        // 3. Posted, unpaid.
        $so = $orders->create([
            'contact_id' => $kunal->id,
            'date' => now()->subDays(38)->toDateString(),
            'lines' => [
                ['product_id' => $diningTable->id, 'quantity' => 1, 'unit_price' => 14500, 'tax_percent' => 18],
                ['product_id' => $diningChair->id, 'quantity' => 4, 'unit_price' => 2200, 'tax_percent' => 18],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoices->post($invoice, $admin->id);

        // 4. Confirmed only - not yet converted to an invoice.
        $so = $orders->create([
            'contact_id' => $ananya->id,
            'date' => now()->subDays(12)->toDateString(),
            'lines' => [
                ['product_id' => $officeChair->id, 'quantity' => 2, 'unit_price' => 6200, 'tax_percent' => 18],
            ],
        ]);
        $orders->confirm($so);

        // 5. Draft only.
        $orders->create([
            'contact_id' => $devika->id,
            'date' => now()->subDays(4)->toDateString(),
            'lines' => [
                ['product_id' => $lamp->id, 'quantity' => 6, 'unit_price' => 900, 'tax_percent' => 12],
            ],
        ]);

        // 6. Fully paid, tagged to Retail Showroom.
        $so = $orders->create([
            'contact_id' => $rohan->id,
            'date' => now()->subDays(28)->toDateString(),
            'lines' => [
                ['product_id' => $recliner->id, 'quantity' => 1, 'unit_price' => 16500, 'tax_percent' => 18, 'analytic_account_id' => $retailShowroom?->id],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoice = $invoices->post($invoice, $admin->id);
        $invoices->registerPayment($invoice, [
            'amount' => $invoice->total, 'payment_via' => 'bank', 'date' => now()->subDays(24)->toDateString(),
        ], $admin->id);

        // 7. Fully paid, tagged to Online Sales Channel.
        $so = $orders->create([
            'contact_id' => $nimesh->id,
            'date' => now()->subDays(20)->toDateString(),
            'lines' => [
                ['product_id' => $chargingDock->id, 'quantity' => 3, 'unit_price' => 1500, 'tax_percent' => 12, 'analytic_account_id' => $onlineSales?->id],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoice = $invoices->post($invoice, $admin->id);
        $invoices->registerPayment($invoice, [
            'amount' => $invoice->total, 'payment_via' => 'cash', 'date' => now()->subDays(18)->toDateString(),
        ], $admin->id);

        // 8. Partially paid, tagged to Online Sales Channel - customer is the
        // `both`-type contact.
        $so = $orders->create([
            'contact_id' => $trident->id,
            'date' => now()->subDays(16)->toDateString(),
            'lines' => [
                ['product_id' => $studyTable->id, 'quantity' => 5, 'unit_price' => 5800, 'tax_percent' => 18, 'analytic_account_id' => $onlineSales?->id],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoice = $invoices->post($invoice, $admin->id);
        $invoices->registerPayment($invoice, [
            'amount' => round(((float) $invoice->total) / 2, 2), 'payment_via' => 'bank', 'date' => now()->subDays(12)->toDateString(),
        ], $admin->id);

        // 9. Posted, unpaid - a service line, no tax.
        $so = $orders->create([
            'contact_id' => $riya->id,
            'date' => now()->subDays(6)->toDateString(),
            'lines' => [
                ['product_id' => $assembly->id, 'quantity' => 2, 'unit_price' => 500, 'tax_percent' => 0],
            ],
        ]);
        $orders->confirm($so);
        $invoice = $orders->convertToInvoice($so->fresh());
        $invoices->post($invoice, $admin->id);

        // 10. Draft only.
        $orders->create([
            'contact_id' => $kunal->id,
            'date' => now()->subDays(1)->toDateString(),
            'lines' => [
                ['product_id' => $sofa->id, 'quantity' => 1, 'unit_price' => 26500, 'tax_percent' => 18],
            ],
        ]);

        // Standalone invoices (no SO), backdated overdue - populates the
        // aging report's 31-60/61-90 buckets.
        $overdueInvoice = $invoices->create([
            'contact_id' => $devika->id,
            'invoice_date' => now()->subDays(50)->toDateString(),
            'due_date' => now()->subDays(20)->toDateString(),
            'invoice_reference' => 'DVK-STANDALONE-01',
            'lines' => [
                ['product_id' => $lamp->id, 'quantity' => 10, 'unit_price' => 900, 'tax_percent' => 12],
            ],
        ]);
        $invoices->post($overdueInvoice, $admin->id);

        $overduePartial = $invoices->create([
            'contact_id' => $ananya->id,
            'invoice_date' => now()->subDays(65)->toDateString(),
            'due_date' => now()->subDays(35)->toDateString(),
            'invoice_reference' => 'ANY-STANDALONE-01',
            'lines' => [
                ['product_id' => $officeChair->id, 'quantity' => 3, 'unit_price' => 6200, 'tax_percent' => 18],
            ],
        ]);
        $overduePartial = $invoices->post($overduePartial, $admin->id);
        $invoices->registerPayment($overduePartial, [
            'amount' => round(((float) $overduePartial->total) / 2, 2),
            'payment_via' => 'cash',
            'date' => now()->subDays(45)->toDateString(),
        ], $admin->id);

        // Deeply overdue, so the 61-90 and 90+ aging buckets are not empty on
        // screen. Without these the report looks like the deep buckets do not
        // work.
        $sixtyOneToNinety = $invoices->create([
            'contact_id' => $kunal->id,
            'invoice_date' => now()->subDays(110)->toDateString(),
            'due_date' => now()->subDays(75)->toDateString(),
            'invoice_reference' => 'KNL-OVERDUE-61',
            'lines' => [
                ['product_id' => $diningChair->id, 'quantity' => 6, 'unit_price' => 2200, 'tax_percent' => 18],
            ],
        ]);
        $invoices->post($sixtyOneToNinety, $admin->id);

        // Unpaid and posted, for the portal user's own contact (Nimesh Patel).
        // The contact portal's headline action is "pay my dues", so the demo
        // account needs something outstanding to pay - without this every
        // portal invoice is already settled and the Pay button has no subject.
        $portalDue = $invoices->create([
            'contact_id' => $nimesh->id,
            'invoice_date' => now()->subDays(12)->toDateString(),
            'due_date' => now()->addDays(6)->toDateString(),
            'invoice_reference' => 'NMP-PORTAL-DUE',
            'lines' => [
                ['product_id' => $officeChair->id, 'quantity' => 2, 'unit_price' => 7800, 'tax_percent' => 18],
                ['product_id' => $lamp->id, 'quantity' => 3, 'unit_price' => 900, 'tax_percent' => 12],
            ],
        ]);
        $invoices->post($portalDue, $admin->id);

        // Partly paid, also for the portal contact, so the portal shows a
        // part-settled row next to a fully outstanding one.
        $portalPartial = $invoices->create([
            'contact_id' => $nimesh->id,
            'invoice_date' => now()->subDays(30)->toDateString(),
            'due_date' => now()->subDays(2)->toDateString(),
            'invoice_reference' => 'NMP-PORTAL-PART',
            'lines' => [
                ['product_id' => $diningChair->id, 'quantity' => 4, 'unit_price' => 2200, 'tax_percent' => 18],
            ],
        ]);
        $portalPartial = $invoices->post($portalPartial, $admin->id);
        $invoices->registerPayment($portalPartial, [
            'amount' => 4000,
            'payment_via' => 'bank',
            'date' => now()->subDays(20)->toDateString(),
        ], $admin->id);

        $ninetyPlus = $invoices->create([
            'contact_id' => $devika->id,
            'invoice_date' => now()->subDays(160)->toDateString(),
            'due_date' => now()->subDays(130)->toDateString(),
            'invoice_reference' => 'DVK-OVERDUE-90',
            'lines' => [
                ['product_id' => $sofa->id, 'quantity' => 1, 'unit_price' => 26500, 'tax_percent' => 18],
            ],
        ]);
        $invoices->post($ninetyPlus, $admin->id);
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
