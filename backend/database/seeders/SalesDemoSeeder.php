<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use App\Models\Contact;
use App\Models\CustomerInvoice;
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
     * The mirror of PurchaseDemoSeeder: seven months of selling, from single
     * retail pieces to two large corporate fit-outs.
     *
     * The mix is deliberate. Two corporate accounts carry most of the revenue,
     * which is what makes the dashboard's top-customer list and the analytic
     * report say something; the individual buyers supply the long tail of small
     * overdue balances that the receivables aging is for.
     *
     * Everything runs through SalesOrderService / CustomerInvoiceService, never
     * a raw insert, so every posted invoice has a real balanced journal entry
     * behind it (docs/SEEDING.md).
     *
     * Between them the rows cover:
     *   - every sales order status: draft, confirmed, invoiced
     *   - every invoice status: draft, posted, paid
     *   - receipts by bank and cash, in full and in instalments
     *   - all four tax rates in use: 0%, 5%, 12% and 18%
     *   - due dates landing in all five aging buckets, plus invoices with none
     *   - lines tagged to each of the three income analytic accounts
     *   - invoices raised with no sales order behind them
     *   - all three portal contacts left in different states: one with dues to
     *     pay, one heavily overdue, one fully settled
     *
     * Guarded on SalesOrder::exists() so re-running db:seed never doubles up.
     */
    public function run(): void
    {
        if (SalesOrder::exists()) {
            return;
        }

        foreach ($this->orders() as $order) {
            $this->sale($order);
        }

        foreach ($this->standaloneInvoices() as $invoice) {
            $this->standaloneInvoice($invoice);
        }
    }

    /**
     * Lines are [product, quantity, unit price, tax %]. Unit price is the
     * product's list price for retail customers and a negotiated one for the
     * corporate accounts - which is the reason the field is editable on the
     * order form at all.
     *
     * @return array<int, array<string, mixed>>
     */
    private function orders(): array
    {
        return [
            // --- Two corporate fit-outs, settled. These are what put the
            // company into profit and what the top-customer panel ranks on.
            [
                'customer' => 'Hotel Saffron Grand', 'days_ago' => 165, 'terms' => 30, 'stage' => 'posted',
                'lines' => [
                    ['Queen Bed with Storage', 12, 30000, 18],
                    ['4-Door Wardrobe', 12, 27000, 18],
                ],
                'analytic' => 'Corporate & Bulk Orders',
                'payments' => [
                    ['amount' => 400000, 'via' => 'bank', 'days_ago' => 150, 'reference' => 'RTGS/ICICI/551204', 'note' => 'Advance against the 12-room refurbishment order'],
                    ['amount' => 'full', 'via' => 'bank', 'days_ago' => 132, 'reference' => 'RTGS/ICICI/556781', 'note' => 'Balance received on handover of the last room'],
                ],
            ],
            [
                'customer' => 'Zenith Coworking LLP', 'days_ago' => 150, 'terms' => 30, 'stage' => 'posted',
                'lines' => [
                    ['Ergonomic Mesh Task Chair', 40, 7200, 18],
                    ['Height-Adjustable Standing Desk', 20, 18500, 18],
                ],
                'analytic' => 'Corporate & Bulk Orders',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 124, 'reference' => 'RTGS/ICICI/560933', 'note' => 'Lower Parel floor fit-out, paid in full within terms']],
            ],
            [
                'customer' => 'Zenith Coworking LLP', 'days_ago' => 60, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Monitor Riser (Oak)', 50, 1800, 18]],
                'analytic' => 'Corporate & Bulk Orders',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 41, 'reference' => 'NEFT/ICICI/571440', 'note' => 'Desk accessories top-up order']],
            ],

            // --- Retail, settled.
            [
                'customer' => 'Nimesh Patel', 'days_ago' => 180, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['3-Seater Fabric Sofa', 1, 26500, 18]],
                'analytic' => 'Retail Showroom',
                'payments' => [['amount' => 'full', 'via' => 'bank', 'days_ago' => 172, 'reference' => 'UPI/8842013779', 'note' => 'Paid at the showroom counter by UPI']],
            ],
            [
                'customer' => 'Riya Mehta', 'days_ago' => 140, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['Dining Set Combo (Table + 4 Chairs)', 1, 29900, 18]],
                'analytic' => 'Retail Showroom',
                'payments' => [['amount' => 'full', 'via' => 'cash', 'days_ago' => 136, 'reference' => 'CASH/RCPT/1180', 'note' => 'Paid in cash on collection, a week after the order']],
            ],

            // --- Part paid.
            [
                // due 65 days ago -> 61-90
                'customer' => 'Kunal Shah', 'days_ago' => 95, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['6-Seater Dining Table', 1, 21000, 18], ['Wooden Dining Chair', 6, 2200, 18]],
                'analytic' => 'Retail Showroom',
                'payments' => [['amount' => 15000, 'via' => 'bank', 'days_ago' => 70, 'reference' => 'UPI/9013447120', 'note' => 'Part payment; customer asked for the balance to be split']],
            ],
            [
                // due 30 days ago -> 1-30
                'customer' => 'Hotel Saffron Grand', 'days_ago' => 75, 'terms' => 45, 'stage' => 'posted',
                'lines' => [['Folding Cafe Chair', 60, 1300, 12]],
                'analytic' => 'Corporate & Bulk Orders',
                'payments' => [['amount' => 40000, 'via' => 'bank', 'days_ago' => 40, 'reference' => 'NEFT/ICICI/566102', 'note' => 'Part payment against the poolside cafe order']],
            ],

            // --- Posted and outstanding, spread across every aging bucket.
            [
                // due 100 days ago -> 90+
                'customer' => 'Devika Rao', 'days_ago' => 130, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['2-Seater Leatherette Sofa', 1, 20000, 18]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // due 80 days ago -> 61-90
                'customer' => 'Meera Krishnan', 'days_ago' => 110, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Bedroom Combo (Queen Bed + Wardrobe)', 1, 57000, 18]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // due 70 days ago -> 61-90; the heavily overdue corporate account
                'customer' => 'Hotel Saffron Grand', 'days_ago' => 100, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Ottoman Footstool', 30, 3200, 18]],
                'analytic' => 'Corporate & Bulk Orders',
            ],
            [
                // due 25 days ago -> 1-30
                'customer' => 'Rohan Verma', 'days_ago' => 55, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Recliner Lounge Chair', 2, 16500, 18]],
                'analytic' => 'Retail Showroom',
            ],
            [
                // due 15 days ago -> 1-30
                'customer' => 'Sahyadri Interiors', 'days_ago' => 45, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Bookshelf (5 Tier)', 10, 7200, 18]],
                'analytic' => 'Corporate & Bulk Orders',
            ],
            [
                // due 15 days ago -> 1-30; the 5% slab, on accessories
                'customer' => 'Meera Krishnan', 'days_ago' => 30, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['Cable Management Tray', 40, 750, 5]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // not due yet -> current
                'customer' => 'Ananya Iyer', 'days_ago' => 20, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Home Office Combo (Desk + Chair + Lamp)', 1, 27500, 18]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // not due yet -> current; customer is the `both`-type contact
                'customer' => 'Trident Trading Co', 'days_ago' => 15, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Compact Study Table', 8, 5800, 18]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // A service, zero-rated, and no credit terms - so a line at 0%
                // tax and an invoice with a null due date both appear.
                'customer' => 'Riya Mehta', 'days_ago' => 8, 'terms' => null, 'stage' => 'posted',
                'lines' => [['Furniture Assembly Service', 3, 500, 0]],
                'analytic' => 'Retail Showroom',
            ],

            // --- The portal account's own dues. The portal's headline action is
            // "pay my dues", so the demo login needs something to pay: one
            // invoice fully outstanding, one already part settled.
            [
                // not due yet -> current
                'customer' => 'Nimesh Patel', 'days_ago' => 25, 'terms' => 30, 'stage' => 'posted',
                'lines' => [['Executive Office Chair', 2, 6200, 18], ['LED Reading Lamp', 3, 900, 12]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                // due 25 days ago -> 1-30
                'customer' => 'Nimesh Patel', 'days_ago' => 40, 'terms' => 15, 'stage' => 'posted',
                'lines' => [['Wooden Dining Chair', 4, 2200, 18]],
                'analytic' => 'Online Sales Channel',
                'payments' => [['amount' => 4000, 'via' => 'bank', 'days_ago' => 22, 'reference' => 'UPI/8842019904', 'note' => 'Part payment made from the customer portal']],
            ],

            // --- Invoice raised but not posted: editable, no ledger entry yet.
            [
                'customer' => 'Rohan Verma', 'days_ago' => 5, 'terms' => 30, 'stage' => 'invoiced',
                'lines' => [['Pendant Ceiling Light', 4, 2800, 18]],
                'analytic' => 'Retail Showroom',
            ],

            // --- Confirmed, not yet invoiced.
            [
                'customer' => 'Ananya Iyer', 'days_ago' => 10, 'terms' => 30, 'stage' => 'confirmed',
                'lines' => [['Executive Office Chair', 4, 6200, 18]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                'customer' => 'Zenith Coworking LLP', 'days_ago' => 5, 'terms' => 45, 'stage' => 'confirmed',
                'lines' => [['Bar Stool (Walnut)', 24, 3400, 18]],
                'analytic' => 'Corporate & Bulk Orders',
            ],

            // --- Quotes still being drafted.
            [
                'customer' => 'Devika Rao', 'days_ago' => 3, 'terms' => 30, 'stage' => 'draft',
                'lines' => [['Tripod Floor Lamp', 6, 3600, 12]],
                'analytic' => 'Online Sales Channel',
            ],
            [
                'customer' => 'Sahyadri Interiors', 'days_ago' => 2, 'terms' => 45, 'stage' => 'draft',
                'lines' => [['Shoe Cabinet', 12, 4600, 18], ['Office Filing Cabinet', 6, 9400, 18]],
                'analytic' => 'Corporate & Bulk Orders',
            ],
            [
                'customer' => 'Kunal Shah', 'days_ago' => 1, 'terms' => null, 'stage' => 'draft',
                'lines' => [['3-Seater Fabric Sofa', 1, 26500, 18]],
                'analytic' => 'Retail Showroom',
            ],
        ];
    }

    /**
     * Invoices billed straight to a customer with no sales order - a walk-in,
     * or a repeat order taken over the phone. invoice_reference holds the
     * customer's own purchase order number, which is why it is entered here
     * rather than generated.
     *
     * @return array<int, array<string, mixed>>
     */
    private function standaloneInvoices(): array
    {
        return [
            [
                // due 170 days ago -> 90+, the oldest thing on the books
                'customer' => 'Devika Rao', 'days_ago' => 200, 'terms' => 30, 'reference' => 'DR/ORD/8814',
                'lines' => [['Single Bed Frame', 1, 13500, 18]],
                'analytic' => 'Online Sales Channel', 'post' => true,
            ],
            [
                // due 35 days ago -> 31-60, part settled in cash
                'customer' => 'Ananya Iyer', 'days_ago' => 65, 'terms' => 30, 'reference' => 'AI-REQ-0357',
                'lines' => [['Executive Office Chair', 3, 6200, 18]],
                'analytic' => 'Retail Showroom', 'post' => true,
                'payments' => [['amount' => 10000, 'via' => 'cash', 'days_ago' => 45, 'reference' => 'CASH/RCPT/1244', 'note' => 'Part payment collected by the delivery team']],
            ],
            [
                // due 45 days ago -> 31-60
                'customer' => 'Rohan Verma', 'days_ago' => 75, 'terms' => 30, 'reference' => 'RV/PO/2026/17',
                'lines' => [['Nesting Coffee Table Set', 3, 8200, 18]],
                'analytic' => 'Retail Showroom', 'post' => true,
            ],
            [
                // Just raised, still being checked before it goes out.
                'customer' => 'Meera Krishnan', 'days_ago' => 2, 'terms' => 15, 'reference' => 'MK/WA/0091',
                'lines' => [['Ottoman Footstool', 2, 3200, 18], ['White-Glove Delivery Service', 1, 1200, 18]],
                'analytic' => 'Online Sales Channel', 'post' => false,
            ],
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function sale(array $spec): void
    {
        $orders = app(SalesOrderService::class);
        $invoices = app(CustomerInvoiceService::class);

        $date = now()->subDays($spec['days_ago']);

        $order = $orders->create([
            'contact_id' => $this->contact($spec['customer'])->id,
            'date' => $date->toDateString(),
            // Credit terms are agreed with the order and carry onto the invoice.
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

        $invoice = $orders->convertToInvoice($order->fresh());

        // Conversion dates the invoice today, which is right in real use - you
        // invoice when the goods go out. Seeding history means saying when that
        // was instead, so the draft's date is set through the same update the
        // invoice form would use. Without this every converted invoice is dated
        // today while carrying a due date months in the past, and a closed
        // budget period contains nothing at all.
        $invoice = $invoices->update($invoice, [
            'invoice_date' => $date->copy()->addDays($spec['lag'] ?? 3)->toDateString(),
        ]);

        if ($spec['stage'] === 'invoiced') {
            return;
        }

        $invoice = $invoices->post($invoice, $this->poster($spec['days_ago'])->id);

        $this->receive($invoice, $spec['payments'] ?? []);
    }

    /** @param  array<string, mixed>  $spec */
    private function standaloneInvoice(array $spec): void
    {
        $invoices = app(CustomerInvoiceService::class);
        $date = now()->subDays($spec['days_ago']);

        $invoice = $invoices->create([
            'contact_id' => $this->contact($spec['customer'])->id,
            'invoice_date' => $date->toDateString(),
            'due_date' => $date->copy()->addDays($spec['terms'])->toDateString(),
            'invoice_reference' => $spec['reference'],
            'lines' => $this->lines($spec),
        ]);

        if ($spec['post'] === false) {
            return;
        }

        $invoice = $invoices->post($invoice, $this->poster($spec['days_ago'])->id);

        $this->receive($invoice, $spec['payments'] ?? []);
    }

    /** @param  array<int, array<string, mixed>>  $payments */
    private function receive(CustomerInvoice $invoice, array $payments): void
    {
        $invoices = app(CustomerInvoiceService::class);

        foreach ($payments as $payment) {
            $amount = $payment['amount'] === 'full'
                ? $invoices->amountDue($invoice->fresh())
                : $payment['amount'];

            $invoices->registerPayment($invoice, [
                'amount' => $amount,
                'payment_via' => $payment['via'],
                'date' => now()->subDays($payment['days_ago'])->toDateString(),
                'reference' => $payment['reference'],
                'note' => $payment['note'],
            ], $this->poster($payment['days_ago'])->id);
        }
    }

    /**
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
            'tax_percent' => $line[3],
            'analytic_account_id' => $analyticId,
        ], $spec['lines']);
    }

    /** Alternates the two accountants so "posted by" varies across the ledger. */
    private function poster(int $daysAgo): User
    {
        static $users = [];

        $loginId = $daysAgo % 2 === 0 ? 'accountant2' : 'accountant1';

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
