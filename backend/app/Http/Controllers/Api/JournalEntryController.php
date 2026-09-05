<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only on purpose. Entries are created by the system when a bill, invoice
 * or payment is posted - never entered by hand - so there is no store, update
 * or destroy here. Exposing one would let a user write an unbalanced entry
 * straight into the ledger.
 */
class JournalEntryController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorizeLedger($request);

        $entries = JournalEntry::query()
            ->with(['journal:id,name,type'])
            ->withSum('lines as total_debit', 'debit')
            ->withSum('lines as total_credit', 'credit')
            ->when($request->query('journal_id'), fn ($q, $id) => $q->where('journal_id', $id))
            ->when($request->query('source_type'), fn ($q, $type) => $q->where('source_type', $type))
            ->when($request->query('from'), fn ($q, $from) => $q->whereDate('date', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->whereDate('date', '<=', $to))
            ->when($request->query('search'), fn ($q, $term) => $q->where('reference', 'like', "%{$term}%"))
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (JournalEntry $entry) => $this->summary($entry));

        return $this->ok('Journal entries fetched successfully', $entries);
    }

    public function show(Request $request, JournalEntry $journalEntry): JsonResponse
    {
        $this->authorizeLedger($request);

        $journalEntry->load([
            'journal:id,name,type',
            'creator:id,name,login_id',
            'lines.account:id,code,name,type',
            'lines.analyticAccount:id,name,type',
        ]);

        return $this->ok('Journal entry fetched successfully', array_merge($journalEntry->toArray(), [
            'total_debit' => $journalEntry->totalDebit(),
            'total_credit' => $journalEntry->totalCredit(),
            'balanced' => $journalEntry->isBalanced(),
        ]));
    }

    private function summary(JournalEntry $entry): array
    {
        $debit = number_format((float) $entry->total_debit, 2, '.', '');
        $credit = number_format((float) $entry->total_credit, 2, '.', '');

        return array_merge($entry->toArray(), [
            'total_debit' => $debit,
            'total_credit' => $credit,
            'balanced' => $debit === $credit,
        ]);
    }

    private function authorizeLedger(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'accountant']), 403);
    }
}
