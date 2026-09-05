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
     * The capital the owners put into Urban Furniture on day one.
     *
     * Without it Cash goes negative the moment the first bill is paid and
     * Capital never appears on the Balance Sheet, so the statements look wrong
     * before anyone has done anything. Dated 210 days back, ahead of the
     * earliest transaction the demo seeders post, so no payment ever draws on
     * money the company did not yet have.
     *
     * Posted through JournalEntryService, never a raw insert, so the balance
     * invariant holds for the opening entry too.
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

        $date = now()->subDays(210)->toDateString();

        // Most of the capital sits in the bank; the till float is small, which
        // is why cash payments in the demo are the small ones.
        $journalEntries->postDoubleEntry(
            journalId: $cashJournal->id,
            date: $date,
            sourceType: 'opening_balance',
            sourceId: 0,
            debitAccountId: $cash->id,
            creditAccountId: $capital->id,
            amount: '250000.00',
            reference: 'OB/CASH/2026',
            description: 'Opening capital contribution - cash in hand',
            createdBy: $admin->id,
        );

        $journalEntries->postDoubleEntry(
            journalId: $bankJournal->id,
            date: $date,
            sourceType: 'opening_balance',
            sourceId: 0,
            debitAccountId: $bank->id,
            creditAccountId: $capital->id,
            amount: '2850000.00',
            reference: 'OB/BANK/2026',
            description: 'Opening capital contribution - current account, HDFC Bank',
            createdBy: $admin->id,
        );
    }
}
