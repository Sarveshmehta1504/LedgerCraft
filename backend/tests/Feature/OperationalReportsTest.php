<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\CustomerInvoice;
use App\Models\Journal;
use App\Models\Payment;
use App\Models\VendorBill;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationalReportsTest extends TestCase
{
    use RefreshDatabase;

    private ReportService $reports;

    private Contact $contact;

    protected function setUp(): void
    {
        parent::setUp();

        $this->reports = new ReportService;
        $this->contact = Contact::create(['name' => 'Nimesh', 'type' => 'both']);

        foreach ([['1000', 'Cash', 'cash'], ['1010', 'Bank', 'bank'], ['1100', 'Debtors', 'asset']] as [$code, $name, $type]) {
            ChartOfAccount::create(['code' => $code, 'name' => $name, 'type' => $type]);
        }
    }

    private function invoice(string $total, ?string $dueDate, string $status = 'posted', string $date = '2026-09-01'): CustomerInvoice
    {
        return CustomerInvoice::create([
            'invoice_number' => 'INV/'.uniqid(),
            'contact_id' => $this->contact->id,
            'invoice_date' => $date,
            'due_date' => $dueDate,
            'status' => $status,
            'total' => $total,
        ]);
    }

    private function pay(CustomerInvoice $invoice, string $amount): void
    {
        Payment::create([
            'contact_id' => $this->contact->id,
            'payment_type' => 'receive',
            'payable_type' => 'customer_invoice',
            'payable_id' => $invoice->id,
            'payment_via' => 'bank',
            'journal_id' => Journal::create(['name' => 'Bank', 'type' => 'bank'])->id,
            'amount' => $amount,
            'date' => '2026-09-02',
        ]);
    }

    public function test_aging_puts_an_undated_document_in_current(): void
    {
        $this->invoice('5000', null);

        $aging = $this->reports->aging('2026-12-31');

        $this->assertSame('5000.00', $aging['receivable']['buckets']['current']);
        $this->assertSame('5000.00', $aging['receivable']['total']);
    }

    public function test_aging_buckets_by_days_overdue(): void
    {
        $this->invoice('1000', '2026-09-01');  // 14 days at as_of
        $this->invoice('2000', '2026-08-01');  // 45 days
        $this->invoice('4000', '2026-05-01');  // 137 days

        $buckets = $this->reports->aging('2026-09-15')['receivable']['buckets'];

        $this->assertSame('1000.00', $buckets['1_30']);
        $this->assertSame('2000.00', $buckets['31_60']);
        $this->assertSame('4000.00', $buckets['90_plus']);
    }

    public function test_aging_reports_the_unpaid_balance_not_the_total(): void
    {
        $invoice = $this->invoice('10000', null);
        $this->pay($invoice, '4000');

        $receivable = $this->reports->aging('2026-09-15')['receivable'];

        $this->assertSame('6000.00', $receivable['total']);
        $this->assertSame('6000.00', $receivable['documents'][0]['balance']);
    }

    public function test_a_fully_paid_document_drops_out_of_aging(): void
    {
        $invoice = $this->invoice('10000', null);
        $this->pay($invoice, '10000');

        $this->assertSame('0.00', $this->reports->aging('2026-09-15')['receivable']['total']);
        $this->assertCount(0, $this->reports->aging('2026-09-15')['receivable']['documents']);
    }

    public function test_draft_documents_are_not_aged(): void
    {
        $this->invoice('9000', '2026-01-01', 'draft');

        $this->assertSame('0.00', $this->reports->aging('2026-09-15')['receivable']['total']);
    }

    public function test_dashboard_reports_outstanding_receivable_and_payable(): void
    {
        $invoice = $this->invoice('10000', null);
        $this->pay($invoice, '2500');

        VendorBill::create([
            'bill_number' => 'Bill/1',
            'contact_id' => $this->contact->id,
            'bill_date' => '2026-09-01',
            'status' => 'posted',
            'total' => '4000',
        ]);

        $dashboard = $this->reports->dashboard();

        $this->assertSame('7500.00', $dashboard['total_receivable']);
        $this->assertSame('4000.00', $dashboard['total_payable']);
        $this->assertSame(1, $dashboard['counts']['customer_invoices_unpaid']);
    }

    public function test_dashboard_top_customers_ranks_by_revenue(): void
    {
        $other = Contact::create(['name' => 'Azure', 'type' => 'customer']);

        $this->invoice('5000', null);
        CustomerInvoice::create([
            'invoice_number' => 'INV/big',
            'contact_id' => $other->id,
            'invoice_date' => '2026-09-01',
            'status' => 'paid',
            'total' => '20000',
        ]);

        $top = $this->reports->dashboard()['top_customers'];

        $this->assertSame('Azure', $top[0]['name']);
        $this->assertSame('20000.00', $top[0]['revenue']);
    }
}
