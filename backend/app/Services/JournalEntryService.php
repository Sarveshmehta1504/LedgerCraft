<?php

namespace App\Services;

use App\Exceptions\UnbalancedJournalEntryException;
use App\Models\JournalEntry;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * The single place a journal entry is ever created.
 *
 * Every posted vendor bill, customer invoice and payment goes through here, so
 * the double-entry invariant - sum(debit) == sum(credit) - is enforced exactly
 * once, inside the same database transaction as the write. Nothing else in the
 * codebase should insert into journal_entries or journal_entry_lines.
 */
class JournalEntryService
{
    /**
     * @param  array{
     *     journal_id:int, date:mixed, source_type:string, source_id:int,
     *     reference?:string|null, created_by?:int|null,
     *     lines:array<int, array{account_id:int, debit?:mixed, credit?:mixed,
     *                            analytic_account_id?:int|null, description?:string|null}>
     * }  $payload
     *
     * @throws UnbalancedJournalEntryException
     */
    public function create(array $payload): JournalEntry
    {
        $lines = $payload['lines'] ?? [];

        $this->assertBalanced($lines);

        return DB::transaction(function () use ($payload, $lines) {
            $entry = JournalEntry::create([
                'journal_id' => $payload['journal_id'],
                'date' => $payload['date'],
                'reference' => $payload['reference'] ?? null,
                'source_type' => $payload['source_type'],
                'source_id' => $payload['source_id'],
                'created_by' => $payload['created_by'] ?? Auth::id(),
            ]);

            foreach ($lines as $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'debit' => $this->normalise($line['debit'] ?? 0),
                    'credit' => $this->normalise($line['credit'] ?? 0),
                    'analytic_account_id' => $line['analytic_account_id'] ?? null,
                    'description' => $line['description'] ?? null,
                ]);
            }

            return $entry->load('lines');
        });
    }

    /**
     * The common two-line case: debit one account, credit another, same amount.
     * Used by bill/invoice posting and by payments.
     */
    public function postDoubleEntry(
        int $journalId,
        mixed $date,
        string $sourceType,
        int $sourceId,
        int $debitAccountId,
        int $creditAccountId,
        mixed $amount,
        ?string $reference = null,
        ?int $analyticAccountId = null,
        ?string $description = null,
        ?int $createdBy = null,
    ): JournalEntry {
        return $this->create([
            'journal_id' => $journalId,
            'date' => $date,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'reference' => $reference,
            'created_by' => $createdBy,
            'lines' => [
                [
                    'account_id' => $debitAccountId,
                    'debit' => $amount,
                    'credit' => 0,
                    'analytic_account_id' => $analyticAccountId,
                    'description' => $description,
                ],
                [
                    'account_id' => $creditAccountId,
                    'debit' => 0,
                    'credit' => $amount,
                    'analytic_account_id' => $analyticAccountId,
                    'description' => $description,
                ],
            ],
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     *
     * @throws UnbalancedJournalEntryException
     */
    private function assertBalanced(array $lines): void
    {
        if (count($lines) < 2) {
            throw new UnbalancedJournalEntryException(
                'A journal entry needs at least two lines to be double-entry',
            );
        }

        $debitCents = 0;
        $creditCents = 0;

        foreach ($lines as $index => $line) {
            if (empty($line['account_id'])) {
                throw new UnbalancedJournalEntryException(
                    "Journal entry line {$index} has no account",
                );
            }

            $debit = $this->toCents($line['debit'] ?? 0, $index);
            $credit = $this->toCents($line['credit'] ?? 0, $index);

            // A line is one side of the transaction. Allowing both would let a
            // line net itself out and hide a mistake inside a balanced total.
            if ($debit > 0 && $credit > 0) {
                throw new UnbalancedJournalEntryException(
                    "Journal entry line {$index} cannot have both a debit and a credit",
                );
            }

            $debitCents += $debit;
            $creditCents += $credit;
        }

        if ($debitCents === 0 && $creditCents === 0) {
            throw new UnbalancedJournalEntryException(
                'A journal entry cannot be for zero',
            );
        }

        if ($debitCents !== $creditCents) {
            throw UnbalancedJournalEntryException::mismatch(
                $this->fromCents($debitCents),
                $this->fromCents($creditCents),
            );
        }
    }

    /**
     * Money is compared in integer paise, never as floats: 0.1 + 0.2 !== 0.3 in
     * binary floating point, and an entry that is one paise out must be caught.
     * Integers also avoid depending on ext-bcmath being installed.
     */
    private function toCents(mixed $amount, int $index): int
    {
        if (! is_numeric($amount)) {
            throw new UnbalancedJournalEntryException(
                "Journal entry line {$index} has a non-numeric amount",
            );
        }

        $cents = (int) round(((float) $amount) * 100);

        if ($cents < 0) {
            throw new UnbalancedJournalEntryException(
                "Journal entry line {$index} has a negative amount - use the opposite side instead",
            );
        }

        return $cents;
    }

    private function fromCents(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    private function normalise(mixed $amount): string
    {
        return $this->fromCents((int) round(((float) $amount) * 100));
    }
}
