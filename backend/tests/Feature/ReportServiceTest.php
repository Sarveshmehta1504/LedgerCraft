<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Journal;
use App\Models\User;
use App\Services\JournalEntryService;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReportService $reports;

    private JournalEntryService $entries;

    private array $accounts = [];

    private Journal $journal;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->reports = new ReportService;
        $this->entries = new JournalEntryService;
        $this->user = User::factory()->create();
        $this->journal = Journal::create(['name' => 'General', 'type' => 'sales']);

        foreach ([
            ['1000', 'Cash', 'cash'],
            ['1010', 'Bank', 'bank'],
            ['1100', 'Debtors', 'asset'],
            ['2000', 'Creditors', 'liability'],
            ['3000', 'Capital', 'capital'],
            ['4000', 'Sale Income', 'income'],
            ['5000', 'Purchase Expense', 'expense'],
            ['6000', 'Other Expense', 'other_expense'],
        ] as [$code, $name, $type]) {
            $this->accounts[$type] = ChartOfAccount::create(['code' => $code, 'name' => $name, 'type' => $type]);
        }
    }

    private function entry(string $debitType, string $creditType, string $amount, string $date = '2026-09-01'): void
    {
        $this->entries->postDoubleEntry(
            journalId: $this->journal->id,
            date: $date,
            sourceType: 'vendor_bill',
            sourceId: 1,
            debitAccountId: $this->accounts[$debitType]->id,
            creditAccountId: $this->accounts[$creditType]->id,
            amount: $amount,
            createdBy: $this->user->id,
        );
    }

    public function test_empty_ledger_produces_a_balanced_zero_report(): void
    {
        $sheet = $this->reports->balanceSheet();

        $this->assertSame('0.00', $sheet['total_assets']);
        $this->assertSame('0.00', $sheet['total_liabilities_and_capital']);
        $this->assertTrue($sheet['balanced']);
    }

    public function test_profit_and_loss_is_income_minus_expenses(): void
    {
        // Invoice: Debtors 10000 / Sale Income 10000
        $this->entry('asset', 'income', '10000');
        // Bill: Purchase Expense 4000 / Creditors 4000
        $this->entry('expense', 'liability', '4000');
        // Bank charge: Other Expense 500 / Bank 500
        $this->entry('other_expense', 'bank', '500');

        $pl = $this->reports->profitAndLoss();

        $this->assertSame('10000.00', $pl['total_income']);
        $this->assertSame('4500.00', $pl['total_expenses']);
        $this->assertSame('5500.00', $pl['net_income']);
    }

    /**
     * The headline claim of the whole system: the sheet must balance once net
     * income is carried into equity as retained earnings.
     */
    public function test_balance_sheet_balances_after_a_full_trading_cycle(): void
    {
        $this->entry('cash', 'capital', '50000');      // owner puts in capital
        $this->entry('expense', 'liability', '10000'); // vendor bill
        $this->entry('liability', 'bank', '10000');    // pay the bill
        $this->entry('asset', 'income', '25000');      // customer invoice
        $this->entry('bank', 'asset', '25000');        // customer pays

        $sheet = $this->reports->balanceSheet();

        $this->assertSame('15000.00', $sheet['capital']['retained_earnings']);
        $this->assertSame($sheet['total_assets'], $sheet['total_liabilities_and_capital']);
        $this->assertTrue($sheet['balanced'], 'Assets must equal Liabilities + Capital');
    }

    public function test_retained_earnings_equals_net_income(): void
    {
        $this->entry('asset', 'income', '8000');
        $this->entry('expense', 'liability', '3000');

        $pl = $this->reports->profitAndLoss();
        $sheet = $this->reports->balanceSheet();

        $this->assertSame($pl['net_income'], $sheet['capital']['retained_earnings']);
    }

    public function test_reports_respect_the_date_range(): void
    {
        $this->entry('asset', 'income', '1000', '2026-09-01');
        $this->entry('asset', 'income', '2000', '2026-10-01');

        $september = $this->reports->profitAndLoss('2026-09-01', '2026-09-30');
        $everything = $this->reports->profitAndLoss();

        $this->assertSame('1000.00', $september['total_income']);
        $this->assertSame('3000.00', $everything['total_income']);
    }

    public function test_balance_sheet_as_of_excludes_later_entries(): void
    {
        $this->entry('asset', 'income', '1000', '2026-09-01');
        $this->entry('asset', 'income', '5000', '2026-12-01');

        $sheet = $this->reports->balanceSheet('2026-09-30');

        $this->assertSame('1000.00', $sheet['total_assets']);
        $this->assertTrue($sheet['balanced']);
    }

    public function test_trial_balance_totals_match(): void
    {
        $this->entry('asset', 'income', '7500');
        $this->entry('expense', 'liability', '2500');

        $trial = $this->reports->trialBalance();

        $this->assertSame('10000.00', $trial['total_debit']);
        $this->assertSame('10000.00', $trial['total_credit']);
        $this->assertTrue($trial['balanced']);
    }
}
