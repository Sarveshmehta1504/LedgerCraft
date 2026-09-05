<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\JournalRequest;
use App\Models\Journal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Journal::class);

        // Default accounts are embedded so the list can show account names
        // without a second round trip.
        $journals = Journal::query()
            ->with([
                'debitAccount:id,code,name,type',
                'creditAccount:id,code,name,type',
            ])
            ->archiveFilter($request->query('archived'))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('search'), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->orderBy('name')
            ->get();

        return $this->ok('Journals fetched successfully', $journals);
    }

    public function store(JournalRequest $request): JsonResponse
    {
        $this->authorize('create', Journal::class);

        $journal = Journal::create($request->validated())
            ->load(['debitAccount:id,code,name,type', 'creditAccount:id,code,name,type']);

        return $this->ok('Journal created successfully', $journal, 201);
    }

    public function show(Journal $journal): JsonResponse
    {
        $this->authorize('view', $journal);

        return $this->ok('Journal fetched successfully', $journal->load([
            'debitAccount:id,code,name,type',
            'creditAccount:id,code,name,type',
        ]));
    }

    public function update(JournalRequest $request, Journal $journal): JsonResponse
    {
        $this->authorize('update', $journal);

        $journal->update($request->validated());

        return $this->ok('Journal updated successfully', $journal->load([
            'debitAccount:id,code,name,type',
            'creditAccount:id,code,name,type',
        ]));
    }

    public function archive(Journal $journal): JsonResponse
    {
        $this->authorize('archive', $journal);

        $journal->archived_at = now();
        $journal->save();

        return $this->ok('Journal archived successfully', $journal);
    }

    public function unarchive(Journal $journal): JsonResponse
    {
        $this->authorize('archive', $journal);

        $journal->archived_at = null;
        $journal->save();

        return $this->ok('Journal unarchived successfully', $journal);
    }

    /**
     * A journal that has posted entries is part of the ledger's history.
     */
    public function destroy(Journal $journal): JsonResponse
    {
        $this->authorize('delete', $journal);

        if ($journal->entries()->exists()) {
            return $this->fail('Journal has posted entries and cannot be deleted - archive it instead', 409);
        }

        $journal->delete();

        return $this->ok('Journal deleted successfully');
    }
}
