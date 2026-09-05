<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\AnalyticAccountRequest;
use App\Models\AnalyticAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticAccountController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AnalyticAccount::class);

        $accounts = AnalyticAccount::query()
            ->withCount('budgets')
            ->archiveFilter($request->query('archived'))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('search'), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->orderBy('name')
            ->get();

        return $this->ok('Analytic accounts fetched successfully', $accounts);
    }

    public function store(AnalyticAccountRequest $request): JsonResponse
    {
        $this->authorize('create', AnalyticAccount::class);

        $account = AnalyticAccount::create($request->validated());

        return $this->ok('Analytic account created successfully', $account, 201);
    }

    /**
     * The form shows every budget the analytic account is used in, per the
     * design board: Budget | Start Date | End Date | Committed | Achieved.
     */
    public function show(AnalyticAccount $analyticAccount): JsonResponse
    {
        $this->authorize('view', $analyticAccount);

        return $this->ok('Analytic account fetched successfully', $analyticAccount->load([
            'budgets:id,name,analytic_account_id,period_start,period_end,committed_amount,status',
        ]));
    }

    public function update(AnalyticAccountRequest $request, AnalyticAccount $analyticAccount): JsonResponse
    {
        $this->authorize('update', $analyticAccount);

        $analyticAccount->update($request->validated());

        return $this->ok('Analytic account updated successfully', $analyticAccount);
    }

    public function archive(AnalyticAccount $analyticAccount): JsonResponse
    {
        $this->authorize('archive', $analyticAccount);

        $analyticAccount->archived_at = now();
        $analyticAccount->save();

        return $this->ok('Analytic account archived successfully', $analyticAccount);
    }

    public function unarchive(AnalyticAccount $analyticAccount): JsonResponse
    {
        $this->authorize('archive', $analyticAccount);

        $analyticAccount->archived_at = null;
        $analyticAccount->save();

        return $this->ok('Analytic account unarchived successfully', $analyticAccount);
    }

    public function destroy(AnalyticAccount $analyticAccount): JsonResponse
    {
        $this->authorize('delete', $analyticAccount);

        if ($analyticAccount->budgets()->exists()) {
            return $this->fail('Analytic account is used by a budget and cannot be deleted', 409);
        }

        if ($analyticAccount->journalEntryLines()->exists()) {
            return $this->fail('Analytic account is used by posted journal entries and cannot be deleted', 409);
        }

        $analyticAccount->delete();

        return $this->ok('Analytic account deleted successfully');
    }
}
