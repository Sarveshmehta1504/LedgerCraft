<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\CustomerInvoice;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\VendorBill;
use Illuminate\Database\Eloquent\Collection;
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
            ->get();

        $partners = $this->partnersFor($entries);

        return $this->ok(
            'Journal entries fetched successfully',
            $entries->map(fn (JournalEntry $entry) => $this->summary($entry, $partners)),
        );
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

        $partner = $journalEntry->partner();

        return $this->ok('Journal entry fetched successfully', array_merge($journalEntry->toArray(), [
            'total_debit' => $journalEntry->totalDebit(),
            'total_credit' => $journalEntry->totalCredit(),
            'balanced' => $journalEntry->isBalanced(),
            'partner' => $partner?->only(['id', 'name', 'type']),
        ]));
    }

    private function summary(JournalEntry $entry, array $partners = []): array
    {
        $debit = number_format((float) $entry->total_debit, 2, '.', '');
        $credit = number_format((float) $entry->total_credit, 2, '.', '');

        return array_merge($entry->toArray(), [
            'total_debit' => $debit,
            'total_credit' => $credit,
            'balanced' => $debit === $credit,
            'partner' => $partners[$entry->source_type.':'.$entry->source_id] ?? null,
        ]);
    }

    /**
     * Resolves every entry's partner in three queries rather than one per row:
     * group the entries by source type, fetch those documents in bulk, then map
     * document -> contact.
     *
     * @return array<string, array<string, mixed>> keyed "sourceType:sourceId"
     */
    private function partnersFor(Collection $entries): array
    {
        $models = [
            'vendor_bill' => VendorBill::class,
            'customer_invoice' => CustomerInvoice::class,
            'payment' => Payment::class,
        ];

        $partners = [];

        foreach ($models as $sourceType => $model) {
            $ids = $entries->where('source_type', $sourceType)->pluck('source_id')->unique();

            if ($ids->isEmpty()) {
                continue;
            }

            $model::with('contact:id,name,type')
                ->select('id', 'contact_id')
                ->whereIn('id', $ids)
                ->get()
                ->each(function ($document) use (&$partners, $sourceType) {
                    $partners[$sourceType.':'.$document->id] = $document->contact?->only(['id', 'name', 'type']);
                });
        }

        return $partners;
    }

    private function authorizeLedger(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'accountant']), 403);
    }
}
