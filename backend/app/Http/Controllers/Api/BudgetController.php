<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\BudgetRequest;
use App\Http\Requests\ReviseBudgetRequest;
use App\Models\Budget;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class BudgetController extends Controller
{
    use ApiResponse;

    private const RELATIONS = [
        'analyticAccount:id,name,type',
        'responsible:id,name,type,email',
        'revisionOf:id,name,status,committed_amount',
    ];

    public function __construct(
        private readonly BudgetService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Budget::class);

        $budgets = Budget::query()
            ->with(self::RELATIONS)
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('analytic_account_id'), fn ($q, $id) => $q->where('analytic_account_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->orderByDesc('period_start')
            ->get()
            ->map(fn (Budget $budget) => $this->withFigures($budget));

        return $this->ok('Budgets fetched successfully', $budgets);
    }

    public function store(BudgetRequest $request): JsonResponse
    {
        $this->authorize('create', Budget::class);

        $budget = $this->service->create($request->validated());

        return $this->ok('Budget created successfully', $this->withFigures($budget->load(self::RELATIONS)), 201);
    }

    public function show(Budget $budget): JsonResponse
    {
        $this->authorize('view', $budget);

        return $this->ok('Budget fetched successfully', $this->withFigures($budget->load(self::RELATIONS)));
    }

    public function update(BudgetRequest $request, Budget $budget): JsonResponse
    {
        $this->authorize('update', $budget);

        try {
            $updated = $this->service->update($budget, $request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Budget updated successfully', $this->withFigures($updated->load(self::RELATIONS)));
    }

    public function confirm(Budget $budget): JsonResponse
    {
        $this->authorize('update', $budget);

        try {
            $confirmed = $this->service->confirm($budget);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Budget confirmed', $this->withFigures($confirmed->load(self::RELATIONS)));
    }

    /**
     * Creates the replacement budget and moves this one to `revised`, so the
     * response is the NEW budget, not the one that was revised.
     */
    public function revise(ReviseBudgetRequest $request, Budget $budget): JsonResponse
    {
        $this->authorize('update', $budget);

        try {
            $revision = $this->service->revise($budget, $request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Budget revised', $this->withFigures($revision->load(self::RELATIONS)), 201);
    }

    public function cancel(Budget $budget): JsonResponse
    {
        $this->authorize('update', $budget);

        try {
            $cancelled = $this->service->cancel($budget);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Budget cancelled', $this->withFigures($cancelled->load(self::RELATIONS)));
    }

    /**
     * The list behind the Achieved Amount figure - the invoices or bills that
     * produced it.
     */
    public function achievedDocuments(Budget $budget): JsonResponse
    {
        $this->authorize('view', $budget);

        return $this->ok('Achieved documents fetched successfully', $this->service->achievedDocuments($budget));
    }

    public function destroy(Budget $budget): JsonResponse
    {
        $this->authorize('delete', $budget);

        if ($budget->status !== 'draft') {
            return $this->fail('Only a draft budget can be deleted - cancel it instead', 409);
        }

        $budget->delete();

        return $this->ok('Budget deleted successfully');
    }

    private function withFigures(Budget $budget): array
    {
        return array_merge($budget->toArray(), $this->service->figures($budget));
    }
}
