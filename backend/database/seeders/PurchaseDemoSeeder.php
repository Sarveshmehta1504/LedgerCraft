<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use App\Models\Contact;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\VendorBill;
use App\Services\PurchaseOrderService;
use App\Services\VendorBillService;
use Illuminate\Database\Seeder;
use RuntimeException;

class PurchaseDemoSeeder extends Seeder
{
    /**
     * Roughly seven months of buying: raw material for the workshop, finished
     * electronics for resale, freight, polish, and one batch of display stock
     * for a trade show.
     *
     * The list is a table rather than twenty copy-pasted blocks so the shape of
     * the demo data is readable at a glance - which vendor, how old, what terms,
     * how far through the lifecycle. Every row still goes through
     * PurchaseOrderService / VendorBillService, never a raw insert, so the
     * ledger is built the same way a user would build it (docs/SEEDING.md).
     *
     * Between them the rows cover:
     *   - every purchase order status: draft, confirmed, billed
     *   - every vendor bill status: draft, posted, paid
     *   - payment by bank and by cash, in full and in instalments
     *   - due dates that land in all five aging buckets, plus bills with none
     *   - lines tagged to each of the three expense analytic accounts
     *   - bills raised straight against a vendor with no purchase order
     *
     * Guarded on PurchaseOrder::exists() so re-running db:seed on a non-fresh
     * database never doubles the demo data up.
     */
    public function run(): void
    {
        if (PurchaseOrder::exists()) {
            return;
        }

        foreach ($this->orders() as $order) {
            $this->purchase($order);
        }

        foreach ($this->standaloneBills() as $bill) {
            $this->standaloneBill($bill);
        }
    }

    /**
     * `days_ago` is the order date; `terms` is the credit period in days, so
     * due_date = date + terms and the aging bucket follows from the two.
     * `stage` walks the lifecycle: draft -> confirmed -> billed (bill left in
     * draft) -> posted. Payments only apply once posted.
     *
     * @return array<int, array<string, mixed>>
     */
    private function orders(): array
    {
        return [
            // --- Settled long ago: the backbone of the expense side of the P&L.
            [
                'vendor' => 'Bright Woods Timber Co', 'days_ago' => 175, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Teak Wood Plank (per sq ft)', 400, 220]],
                'analytic' => 'Factory Overheads',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 150, 'reference' => 'NEFT/HDFC/774301', 'note' => 'Settled in full against PO on delivery of the second lot']],
            ],
            [
                'vendor' => 'Steelcraft Hardware Suppliers', 'days_ago' => 160, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Steel Hinges (pack of 50)', 100, 350], ['Drawer Slide Set', 80, 260]],
                'analytic' => 'Factory Overheads',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 136, 'reference' => 'NEFT/HDFC/778220', 'note' => 'Fittings for the Q1 wardrobe run']],
            ],
            [
                // Paid down in two instalments, so the payment history on a
                // single bill has more than one row.
                'vendor' => 'EcoFab Raw Materials', 'days_ago' => 150, 'terms' => 45, 'stage' => 'posted',
                'lines' => [['Upholstery Fabric (per meter)', 500, 180], ['High-Density Foam Sheet', 40, 1250]],
                'analytic' => 'Factory Overheads',
                'payments' => [
                    ['amount' => 60000, 'via' => 'bank', 'days_ago' => 130, 'reference' => 'NEFT/HDFC/781905', 'note' => 'Part payment on receipt of the fabric consignment'],
                    ['amount' => 'full', 'via' => 'bank', 'days_ago' => 108, 'reference' => 'NEFT/HDFC/786440', 'note' => 'Balance cleared after foam quality check'],
                ],
            ],
            [
                // Display stock for a trade show - the one thing tagged to
                // Marketing & Exhibitions, so that analytic account is not empty.
                'vendor' => 'Bright Woods Timber Co', 'days_ago' => 65, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Bar Stool (Walnut)', 20, 1800]],
                'analytic' => 'Marketing & Exhibitions',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 48, 'reference' => 'NEFT/HDFC/802116', 'note' => 'Display stock for the Ahmedabad Home Expo stand']],
            ],

            // --- Small values settled from the till, so the Cash account moves.
            [
                'vendor' => 'Nakoda Polish & Coatings', 'days_ago' => 120, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['PU Polish (5 litre)', 12, 1850]],
                'analytic' => 'Factory Overheads',
                'payments' => [['amount' => 'full', 'via' => 'cash', 'days_ago' => 112, 'reference' => 'CASH/VCH/0219', 'note' => 'Paid from the workshop float against cash memo']],
            ],
            [
                'vendor' => 'Apex Logistics Partners', 'days_ago' => 95, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['Outstation Freight (per shipment)', 8, 900]],
                'analytic' => 'Logistics & Delivery',
                'payments' => [['amount' => 'full', 'via' => 'cash', 'days_ago' => 90, 'reference' => 'CASH/VCH/0244', 'note' => 'Freight to Udaipur and Jaipur, settled with the driver']],
            ],

            // --- Part paid and overdue: the rows the payables aging chases.
            [
                'vendor' => 'Prime Foam & Upholstery', 'days_ago' => 85, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['High-Density Foam Sheet', 60, 1250], ['Leatherette Roll (per meter)', 200, 340]],
                'analytic' => 'Factory Overheads',
                'payments' => [['amount' => 60000, 'via' => 'bank', 'days_ago' => 50, 'reference' => 'NEFT/HDFC/799013', 'note' => 'Part payment; balance held pending short supply of leatherette']],
            ],
            [
                'vendor' => 'Glasscore Interiors Supply', 'days_ago' => 70, 'terms' => 45, 'stage' => 'posted',
                'lines' => [['Plywood Sheet 19mm (8x4)', 40, 2100]],
                'analytic' => 'Showroom Refit',
                'payments' => [['amount' => 30000, 'via' => 'bank', 'days_ago' => 20, 'reference' => 'NEFT/HDFC/808774', 'note' => 'First instalment as agreed on the phone']],
            ],

            // --- Posted and untouched, spread so every aging bucket has a row.
            [
                // due 110 days ago -> 90+
                'vendor' => 'Bright Woods Timber Co', 'days_ago' => 140, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['MDF Board 12mm (8x4)', 60, 950]],
                'analytic' => 'Factory Overheads',
            ],
            [
                // due 80 days ago -> 61-90
                'vendor' => 'Steelcraft Hardware Suppliers', 'days_ago' => 110, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Chair Gas Lift Cylinder', 150, 480]],
                'analytic' => 'Factory Overheads',
            ],
            [
                // due 25 days ago -> 1-30
                'vendor' => 'Vertex Power Solutions', 'days_ago' => 40, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['LED Reading Lamp', 200, 450], ['Pendant Ceiling Light', 50, 1400]],
            ],
            [
                // due 20 days ago -> 1-30; vendor is the `both`-type contact,
                // so the same name appears on the sales side too.
                'vendor' => 'Trident Trading Co', 'days_ago' => 50, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Teak Wood Plank (per sq ft)', 300, 220]],
                'analytic' => 'Factory Overheads',
            ],
            [
                // not due yet -> current
                'vendor' => 'EcoFab Raw Materials', 'days_ago' => 10, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Upholstery Fabric (per meter)', 200, 180]],
                'analytic' => 'Factory Overheads',
            ],
            [
                // No credit terms agreed, so no due date at all - proves a bill
                // with a null due_date is never counted as overdue.
                'vendor' => 'Nakoda Polish & Coatings', 'days_ago' => 18, 'terms' => null, 'stage' => 'posted',
                'lines' => [['Wood Primer (10 litre)', 15, 1400]],
                'analytic' => 'Factory Overheads',
            ],

            // --- Bill raised but not yet posted: sits in the bills list as a
            // draft, editable, with no ledger entry behind it.
            [
                'vendor' => 'Glasscore Interiors Supply', 'days_ago' => 8, 'terms' => 45, 'stage' => 'billed',
                'lines' => [['MDF Board 12mm (8x4)', 30, 950]],
                'analytic' => 'Factory Overheads',
            ],

            // --- Confirmed, awaiting delivery before a bill is raised.
            [
                'vendor' => 'Prime Foam & Upholstery', 'days_ago' => 12, 'terms' => 30, 'stage' => 'confirmed',
                'lines' => [['High-Density Foam Sheet', 30, 1250], ['Leatherette Roll (per meter)', 100, 340]],
                'analytic' => 'Factory Overheads',
            ],
            [
                'vendor' => 'Apex Logistics Partners', 'days_ago' => 6, 'terms' => 15, 'stage' => 'confirmed',
                'lines' => [['Outstation Freight (per shipment)', 6, 900]],
                'analytic' => 'Logistics & Delivery',
            ],

            // --- Still being drafted by the buyer.
            [
                'vendor' => 'Bright Woods Timber Co', 'days_ago' => 4, 'terms' => 30, 'stage' => 'draft',
                'lines' => [['Teak Wood Plank (per sq ft)', 250, 220]],
                'analytic' => 'Factory Overheads',
            ],
            [
                'vendor' => 'Nakoda Polish & Coatings', 'days_ago' => 2, 'terms' => 15, 'stage' => 'draft',
                'lines' => [['Wood Primer (10 litre)', 20, 1400], ['PU Polish (5 litre)', 10, 1850]],
                'analytic' => 'Factory Overheads',
            ],
            [
                'vendor' => 'Vertex Power Solutions', 'days_ago' => 1, 'terms' => null, 'stage' => 'draft',
                'lines' => [['Wireless Charging Dock', 100, 800]],
            ],
        ];
    }

    /**
     * Bills with no purchase order behind them - the ad-hoc invoices a supplier
     * simply sends. These carry bill_reference, the supplier's own document
     * number, which only exists once they have actually billed us.
     *
     * @return array<int, array<string, mixed>>
     */
    private function standaloneBills(): array
    {
        return [
            [
                'vendor' => 'Trident Trading Co', 'days_ago' => 55, 'terms' => 30, 'reference' => 'TTC-2026-114',
                'lines' => [['Steel Hinges (pack of 50)', 60, 350]],
                'analytic' => 'Factory Overheads', 'post' => true,
            ],
            [
                'vendor' => 'Apex Logistics Partners', 'days_ago' => 32, 'terms' => 15, 'reference' => 'APEX/FRT/20261',
                'lines' => [['Outstation Freight (per shipment)', 12, 900], ['White-Glove Delivery Service', 4, 1200]],
                'analytic' => 'Logistics & Delivery', 'post' => true,
                'payments' => [['amount' => 8000, 'via' => 'cash', 'days_ago' => 12, 'reference' => 'CASH/VCH/0288', 'note' => 'Part settled against the monthly freight statement']],
            ],
            [
                // Left as a draft: just arrived, not yet checked or approved.
                'vendor' => 'Sahyadri Interiors', 'days_ago' => 3, 'terms' => 30, 'reference' => 'SI/2026/0412',
                'lines' => [['On-Site Carpentry (per hour)', 24, 250]],
                'post' => false,
            ],
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function purchase(array $spec): void
    {
        $orders = app(PurchaseOrderService::class);
        $bills = app(VendorBillService::class);

        $date = now()->subDays($spec['days_ago']);

        $order = $orders->create([
            'contact_id' => $this->contact($spec['vendor'])->id,
            'date' => $date->toDateString(),
            // Payment terms are agreed when the order is placed, and carry onto
            // the bill on conversion.
            'due_date' => $spec['terms'] === null ? null : $date->copy()->addDays($spec['terms'])->toDateString(),
            'lines' => $this->lines($spec),
        ]);

        if ($spec['stage'] === 'draft') {
            return;
        }

        $orders->confirm($order);

        if ($spec['stage'] === 'confirmed') {
            return;
        }

        $bill = $orders->convertToBill($order->fresh());

        // Conversion dates the bill today, which is right in real use - you
        // convert when the supplier's bill actually lands. Seeding history
        // means saying when that was instead, so the draft's date is set
        // through the same update the bill form would use. Without this every
        // converted bill is dated today while carrying a due date months in
        // the past, and no bill inside a closed budget period ever exists.
        $bill = $bills->update($bill, [
            'bill_date' => $date->copy()->addDays($spec['lag'] ?? 3)->toDateString(),
        ]);

        if ($spec['stage'] === 'billed') {
            return;
        }

        $bill = $bills->post($bill, $this->poster($spec['days_ago'])->id);

        $this->pay($bill, $spec['payments'] ?? []);
    }

    /** @param  array<string, mixed>  $spec */
    private function standaloneBill(array $spec): void
    {
        $bills = app(VendorBillService::class);
        $date = now()->subDays($spec['days_ago']);

        $bill = $bills->create([
            'contact_id' => $this->contact($spec['vendor'])->id,
            'bill_date' => $date->toDateString(),
            'due_date' => $date->copy()->addDays($spec['terms'])->toDateString(),
            'bill_reference' => $spec['reference'],
            'lines' => $this->lines($spec),
        ]);

        if ($spec['post'] === false) {
            return;
        }

        $bill = $bills->post($bill, $this->poster($spec['days_ago'])->id);

        $this->pay($bill, $spec['payments'] ?? []);
    }

    /**
     * @param  array<int, array<string, mixed>>  $payments
     */
    private function pay(VendorBill $bill, array $payments): void
    {
        $bills = app(VendorBillService::class);

        foreach ($payments as $payment) {
            $amount = $payment['amount'] === 'full'
                ? $bills->amountDue($bill->fresh())
                : $payment['amount'];

            $bills->registerPayment($bill, [
                'amount' => $amount,
                'payment_via' => $payment['via'],
                'date' => now()->subDays($payment['days_ago'])->toDateString(),
                'reference' => $payment['reference'],
                'note' => $payment['note'],
            ], $this->poster($payment['days_ago'])->id);
        }
    }

    /**
     * Lines share the document's analytic account: the whole order is bought
     * for one cost centre, which is how a purchase actually works.
     *
     * @param  array<string, mixed>  $spec
     * @return array<int, array<string, mixed>>
     */
    private function lines(array $spec): array
    {
        $analyticId = isset($spec['analytic'])
            ? $this->analytic($spec['analytic'])->id
            : null;

        return array_map(fn (array $line) => [
            'product_id' => $this->product($line[0])->id,
            'quantity' => $line[1],
            'unit_price' => $line[2],
            'analytic_account_id' => $analyticId,
        ], $spec['lines']);
    }

    /**
     * Who posted this to the ledger. Alternating between the two accountants
     * rather than always the admin gives the journal entry list, and the PDF
     * footer, a "posted by" that actually varies.
     */
    private function poster(int $daysAgo): User
    {
        static $users = [];

        $loginId = $daysAgo % 2 === 0 ? 'accountant1' : 'accountant2';

        return $users[$loginId] ??= User::where('login_id', $loginId)->firstOrFail();
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

    private function analytic(string $name): AnalyticAccount
    {
        $account = AnalyticAccount::where('name', $name)->first();

        if ($account === null) {
            throw new RuntimeException("Analytic account '{$name}' not found - run AnalyticAccountSeeder first");
        }

        return $account;
    }
}
