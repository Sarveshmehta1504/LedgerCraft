<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\JournalEntryService;
use Illuminate\Database\Seeder;
use RuntimeException;

class OpeningBalanceSeeder extends Seeder
{
    /**
     * Seeds the opening Capital entry docs/SEEDING.md calls for: without it
     * Cash goes negative as soon as the first bill is paid, and Capital never
     * appears on the Balance Sheet. Posted through JournalEntryService, never
     * a raw insert, so the balance invariant still holds.
     *
     * Guarded on source_type so re-running db:seed on a non-fresh database
     * never posts a second opening balance.
     */
    public function run(): void
    {
        if (JournalEntry::where('source_type', 'opening_balance')->exists()) {
            return;
        }

        $admin = User::where('login_id', 'adminuser')->first();

        if ($admin === null) {
            throw new RuntimeException('Seed the admin user before the opening balance');
        }

        $journalEntries = app(JournalEntryService::class);
        $cashJournal = Journal::where('type', 'cash')->firstOrFail();
        $bankJournal = Journal::where('type', 'bank')->firstOrFail();
        $cash = ChartOfAccount::where('type', 'cash')->firstOrFail();
        $bank = ChartOfAccount::where('type', 'bank')->firstOrFail();
        $capital = ChartOfAccount::where('type', 'capital')->firstOrFail();

        $journalEntries->postDoubleEntry(
            journalId: $cashJournal->id,
            date: now()->subDays(90)->toDateString(),
            sourceType: 'opening_balance',
            sourceId: 0,
            debitAccountId: $cash->id,
            creditAccountId: $capital->id,
            amount: '150000.00',
            reference: 'Opening balance - Cash',
            description: 'Opening capital contribution - cash in hand',
            createdBy: $admin->id,
        );

        $journalEntries->postDoubleEntry(
            journalId: $bankJournal->id,
            date: now()->subDays(90)->toDateString(),
            sourceType: 'opening_balance',
            sourceId: 0,
            debitAccountId: $bank->id,
            creditAccountId: $capital->id,
            amount: '850000.00',
            reference: 'Opening balance - Bank',
            description: 'Opening capital contribution - bank balance',
            createdBy: $admin->id,
        );
    }
}
