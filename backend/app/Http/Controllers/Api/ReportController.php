<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reports are Admin + Accountant only. Portal users see their own documents
 * through /my/*, never company-wide figures.
 */
class ReportController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ReportService $reports,
    ) {}

    public function profitAndLoss(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return $this->ok('Profit and loss report generated', $this->reports->profitAndLoss(
            $validated['from'] ?? null,
            $validated['to'] ?? null,
        ));
    }

    public function balanceSheet(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        $validated = $request->validate([
            'as_of' => ['nullable', 'date'],
        ]);

        return $this->ok('Balance sheet generated', $this->reports->balanceSheet(
            $validated['as_of'] ?? null,
        ));
    }

    public function trialBalance(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        $validated = $request->validate([
            'as_of' => ['nullable', 'date'],
        ]);

        return $this->ok('Trial balance generated', $this->reports->trialBalance(
            $validated['as_of'] ?? null,
        ));
    }

    private function authorizeReports(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'accountant']), 403);
    }
}
