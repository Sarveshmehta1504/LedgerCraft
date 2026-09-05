<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChartOfAccountRequest;
use App\Models\ChartOfAccount;
use App\Models\Journal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartOfAccountController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ChartOfAccount::class);

        $accounts = ChartOfAccount::query()
            ->archiveFilter($request->query('archived'))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($sub) => $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('code', 'like', "%{$term}%")
            ))
            ->orderBy('code')
            ->get();

        return $this->ok('Chart of accounts fetched successfully', $accounts);
    }

    public function store(ChartOfAccountRequest $request): JsonResponse
    {
        $this->authorize('create', ChartOfAccount::class);

        $account = ChartOfAccount::create($request->validated());

        return $this->ok('Account created successfully', $account, 201);
    }

    public function show(ChartOfAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        return $this->ok('Account fetched successfully', $account);
    }

    public function update(ChartOfAccountRequest $request, ChartOfAccount $account): JsonResponse
    {
        $this->authorize('update', $account);

        $account->update($request->validated());

        return $this->ok('Account updated successfully', $account);
    }

    public function archive(ChartOfAccount $account): JsonResponse
    {
        $this->authorize('archive', $account);

        $account->archived_at = now();
        $account->save();

        return $this->ok('Account archived successfully', $account);
    }

    public function unarchive(ChartOfAccount $account): JsonResponse
    {
        $this->authorize('archive', $account);

        $account->archived_at = null;
        $account->save();

        return $this->ok('Account unarchived successfully', $account);
    }

    /**
     * An account that has been posted to, or that a journal points at, is part
     * of the ledger's history and can only be archived.
     */
    public function destroy(ChartOfAccount $account): JsonResponse
    {
        $this->authorize('delete', $account);

        if ($account->journalEntryLines()->exists()) {
            return $this->fail('Account is used by journal entries and cannot be deleted - archive it instead', 409);
        }

        $usedByJournal = Journal::where('default_debit_account', $account->id)
            ->orWhere('default_credit_account', $account->id)
            ->exists();

        if ($usedByJournal) {
            return $this->fail('Account is a journal default and cannot be deleted - archive it instead', 409);
        }

        $account->delete();

        return $this->ok('Account deleted successfully');
    }
}
