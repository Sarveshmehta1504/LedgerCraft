<?php

namespace Tests\Feature;

use App\Exceptions\UnbalancedJournalEntryException;
use App\Models\ChartOfAccount;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use App\Services\JournalEntryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryServiceTest extends TestCase
{
    use RefreshDatabase;

    private JournalEntryService $service;

    private Journal $journal;

    private ChartOfAccount $debit;

    private ChartOfAccount $credit;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new JournalEntryService;

        $this->debit = ChartOfAccount::create(['code' => '5000', 'name' => 'Purchase Expense', 'type' => 'expense']);
        $this->credit = ChartOfAccount::create(['code' => '2000', 'name' => 'Creditors', 'type' => 'liability']);
        $this->journal = Journal::create(['name' => 'Purchase Journal', 'type' => 'purchase']);
        $this->user = User::factory()->create();
    }

    private function payload(array $lines): array
    {
        return [
            'journal_id' => $this->journal->id,
            'date' => '2026-09-01',
            'source_type' => 'vendor_bill',
            'source_id' => 1,
            'reference' => 'Bill/2026/0001',
            'created_by' => $this->user->id,
            'lines' => $lines,
        ];
    }

    public function test_it_creates_a_balanced_entry_with_its_lines(): void
    {
        $entry = $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 10000, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 10000],
        ]));

        $this->assertDatabaseCount('journal_entries', 1);
        $this->assertDatabaseCount('journal_entry_lines', 2);
        $this->assertSame('Bill/2026/0001', $entry->reference);
        $this->assertSame('vendor_bill', $entry->source_type);
        $this->assertEquals('10000.00', $entry->totalDebit());
        $this->assertEquals($entry->totalDebit(), $entry->totalCredit());
    }

    public function test_it_rejects_an_unbalanced_entry(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 10000, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 9999],
        ]));
    }

    public function test_it_rejects_an_entry_that_is_one_paise_out(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => '100.01', 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => '100.00'],
        ]));
    }

    public function test_it_accepts_amounts_that_are_unsafe_as_floats(): void
    {
        // 0.1 + 0.2 !== 0.3 in binary floating point. Integer paise must accept it.
        $entry = $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => '0.10', 'credit' => 0],
            ['account_id' => $this->debit->id, 'debit' => '0.20', 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => '0.30'],
        ]));

        $this->assertEquals('0.30', $entry->totalDebit());
        $this->assertEquals('0.30', $entry->totalCredit());
    }

    public function test_it_writes_nothing_when_the_entry_is_rejected(): void
    {
        try {
            $this->service->create($this->payload([
                ['account_id' => $this->debit->id, 'debit' => 500, 'credit' => 0],
                ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 400],
            ]));
        } catch (UnbalancedJournalEntryException) {
            // expected
        }

        $this->assertDatabaseCount('journal_entries', 0);
        $this->assertDatabaseCount('journal_entry_lines', 0);
    }

    public function test_it_rejects_a_single_line_entry(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 100, 'credit' => 0],
        ]));
    }

    public function test_it_rejects_a_line_with_both_debit_and_credit(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 100, 'credit' => 100],
            ['account_id' => $this->credit->id, 'debit' => 100, 'credit' => 100],
        ]));
    }

    public function test_it_rejects_a_negative_amount(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => -100, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => -100],
        ]));
    }

    public function test_it_rejects_a_zero_value_entry(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 0, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 0],
        ]));
    }

    public function test_it_rejects_a_line_without_an_account(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $this->service->create($this->payload([
            ['account_id' => null, 'debit' => 100, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 100],
        ]));
    }

    public function test_post_double_entry_creates_two_balanced_lines(): void
    {
        $entry = $this->service->postDoubleEntry(
            journalId: $this->journal->id,
            date: '2026-09-02',
            sourceType: 'payment',
            sourceId: 7,
            debitAccountId: $this->debit->id,
            creditAccountId: $this->credit->id,
            amount: '2500.50',
            reference: 'PAY/0007',
            createdBy: $this->user->id,
        );

        $this->assertCount(2, $entry->lines);
        $this->assertEquals('2500.50', $entry->totalDebit());
        $this->assertEquals('2500.50', $entry->totalCredit());

        $debitLine = $entry->lines->firstWhere('account_id', $this->debit->id);
        $this->assertEquals('2500.50', $debitLine->debit);
        $this->assertEquals('0.00', $debitLine->credit);
    }

    public function test_journal_entry_is_an_immutable_audit_record(): void
    {
        $entry = $this->service->create($this->payload([
            ['account_id' => $this->debit->id, 'debit' => 100, 'credit' => 0],
            ['account_id' => $this->credit->id, 'debit' => 0, 'credit' => 100],
        ]));

        $this->assertNotNull($entry->created_at);
        $this->assertNull(JournalEntry::UPDATED_AT);
        $this->assertFalse((new JournalEntryLine)->timestamps);
    }
}
