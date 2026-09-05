<?php

namespace Tests\Feature;

use App\Models\AnalyticAccount;
use App\Models\Budget;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\CustomerInvoice;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\VendorBill;
use App\Services\BudgetService;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use RuntimeException;
use Tests\TestCase;

class BudgetServiceTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private BudgetService $service;

    private AnalyticAccount $income;

    private AnalyticAccount $expense;

    private Contact $contact;

    private Product $product;

    private ChartOfAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new BudgetService;
        $this->income = AnalyticAccount::create(['name' => 'Project 1', 'type' => 'income']);
        $this->expense = AnalyticAccount::create(['name' => 'Furniture', 'type' => 'expense']);
        $this->contact = Contact::create(['name' => 'Nimesh', 'type' => 'both']);

        $this->account = ChartOfAccount::create(['code' => '4000', 'name' => 'Sale Income', 'type' => 'income']);
        $category = ProductCategory::create(['name' => 'Furniture', 'parent_id' => null]);
        $this->product = Product::create([
            'name' => 'Chair', 'type' => 'goods', 'sales_price' => 100,
            'cost_price' => 50, 'category_id' => $category->id,
        ]);
    }

    private function budget(array $overrides = []): Budget
    {
        return $this->service->create(array_merge([
            'name' => 'January 2026',
            'analytic_account_id' => $this->income->id,
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'committed_amount' => 20000,
            'responsible_id' => $this->contact->id,
        ], $overrides));
    }

    private function invoice(string $date, string $subtotal, string $status = 'posted', ?int $analyticId = null): void
    {
        $invoice = CustomerInvoice::create([
            'invoice_number' => 'INV/'.$this->faker->unique()->numberBetween(1000, 9999),
            'contact_id' => $this->contact->id,
            'invoice_date' => $date,
            'status' => $status,
            'total' => $subtotal,
        ]);

        $invoice->lines()->create([
            'product_id' => $this->product->id,
            'account_id' => $this->account->id,
            'analytic_account_id' => $analyticId ?? $this->income->id,
            'quantity' => 1,
            'unit_price' => $subtotal,
            'tax_percent' => 0,
            'subtotal' => $subtotal,
        ]);
    }

    public function test_a_new_budget_starts_as_draft(): void
    {
        $this->assertSame('draft', $this->budget()->status);
    }

    public function test_achieved_is_summed_from_posted_invoice_lines(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-09-10', '12500');

        $this->assertSame('12500.00', $this->service->achievedAmount($budget));
    }

    public function test_draft_invoices_do_not_count_towards_achieved(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-09-10', '5000', 'draft');

        $this->assertSame('0.00', $this->service->achievedAmount($budget));
    }

    public function test_invoices_outside_the_period_do_not_count(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-08-31', '5000');
        $this->invoice('2026-10-01', '5000');
        $this->invoice('2026-09-15', '3000');

        $this->assertSame('3000.00', $this->service->achievedAmount($budget));
    }

    public function test_a_different_analytic_account_does_not_count(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-09-10', '9000', 'posted', $this->expense->id);

        $this->assertSame('0.00', $this->service->achievedAmount($budget));
    }

    public function test_an_expense_budget_reads_vendor_bills(): void
    {
        $budget = $this->budget(['analytic_account_id' => $this->expense->id]);

        $bill = VendorBill::create([
            'bill_number' => 'Bill/2026/0001',
            'contact_id' => $this->contact->id,
            'bill_date' => '2026-09-10',
            'status' => 'posted',
            'total' => 7000,
        ]);
        $bill->lines()->create([
            'product_id' => $this->product->id,
            'account_id' => $this->account->id,
            'analytic_account_id' => $this->expense->id,
            'quantity' => 1, 'unit_price' => 7000, 'subtotal' => 7000,
        ]);

        $this->assertSame('7000.00', $this->service->achievedAmount($budget->fresh()));
    }

    public function test_figures_compute_percent_and_remaining(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-09-10', '5000');

        $figures = $this->service->figures($budget);

        $this->assertSame('5000.00', $figures['achieved_amount']);
        $this->assertSame(25.0, $figures['achieved_percent']);
        $this->assertSame('15000.00', $figures['amount_to_achieve']);
    }

    public function test_a_zero_committed_budget_has_no_percent(): void
    {
        $figures = $this->service->figures($this->budget(['committed_amount' => 0]));

        $this->assertNull($figures['achieved_percent']);
    }

    public function test_only_a_draft_can_be_edited(): void
    {
        $budget = $this->service->confirm($this->budget());

        $this->expectException(RuntimeException::class);
        $this->service->update($budget, ['committed_amount' => 1]);
    }

    public function test_only_a_confirmed_budget_can_be_revised(): void
    {
        $this->expectException(RuntimeException::class);
        $this->service->revise($this->budget(), []);
    }

    public function test_revising_creates_a_replacement_and_supersedes_the_original(): void
    {
        $original = $this->service->confirm($this->budget());

        $revision = $this->service->revise($original, ['committed_amount' => 35000]);

        $this->assertSame('January 2026 Revised', $revision->name);
        $this->assertSame('confirmed', $revision->status);
        $this->assertSame($original->id, $revision->revision_of_id);
        $this->assertSame('35000.00', $revision->committed_amount);
        $this->assertSame('revised', $original->fresh()->status);
    }

    public function test_a_revised_budget_cannot_be_cancelled(): void
    {
        $original = $this->service->confirm($this->budget());
        $this->service->revise($original, []);

        $this->expectException(RuntimeException::class);
        $this->service->cancel($original->fresh());
    }

    /**
     * Without this, revising a budget doubles the committed total on the report.
     */
    public function test_report_totals_exclude_superseded_budgets(): void
    {
        $original = $this->service->confirm($this->budget());
        $this->service->revise($original, ['committed_amount' => 35000]);
        $this->invoice('2026-09-10', '12500');

        $report = (new ReportService)->budget();

        $this->assertCount(2, $report['budgets']);
        $this->assertSame('35000.00', $report['total_committed']);
        $this->assertSame('12500.00', $report['total_achieved']);
        $this->assertSame('22500.00', $report['total_remaining']);
    }

    public function test_achieved_documents_lists_the_source_invoices(): void
    {
        $budget = $this->budget();
        $this->invoice('2026-09-10', '4000');

        $result = $this->service->achievedDocuments($budget);

        $this->assertSame('customer_invoice', $result['document_type']);
        $this->assertCount(1, $result['documents']);
    }
}
