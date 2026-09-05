<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\SendDocumentRequest;
use App\Services\DocumentMailService;
use App\Services\DocumentPdfService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

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

    public function budget(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        $validated = $request->validate([
            'status' => ['nullable', 'in:draft,confirmed,revised,cancelled'],
            'analytic_account_id' => ['nullable', 'exists:analytic_accounts,id'],
        ]);

        return $this->ok('Budget report generated', $this->reports->budget(
            $validated['status'] ?? null,
            isset($validated['analytic_account_id']) ? (int) $validated['analytic_account_id'] : null,
        ));
    }

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        return $this->ok('Dashboard generated', $this->reports->dashboard());
    }

    public function aging(Request $request): JsonResponse
    {
        $this->authorizeReports($request);

        $validated = $request->validate(['as_of' => ['nullable', 'date']]);

        return $this->ok('Aging report generated', $this->reports->aging($validated['as_of'] ?? null));
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

    /** @param string $report balance-sheet | profit-and-loss | budget */
    public function pdf(Request $request, string $report)
    {
        $this->authorizeReports($request);
        $this->assertKnownReport($report);

        return app(DocumentPdfService::class)
            ->report($report, $request->only(['as_of', 'from', 'to']))
            ->download($report.'.pdf');
    }

    public function send(SendDocumentRequest $request, string $report): JsonResponse
    {
        $this->authorizeReports($request);
        $this->assertKnownReport($report);

        // A report has no contact to fall back on, so a recipient is required.
        if (blank($request->validated('to'))) {
            return $this->fail('A recipient is required - pass `to`.', 422);
        }

        try {
            $recipient = app(DocumentMailService::class)->sendReport(
                $report,
                $request->validated('to'),
                $request->validated('subject'),
                $request->only(['as_of', 'from', 'to']),
            );
        } catch (Throwable $e) {
            return $this->fail('Could not send the report: '.$e->getMessage(), 500);
        }

        return $this->ok("Report sent to {$recipient}");
    }

    private function assertKnownReport(string $report): void
    {
        abort_unless(
            in_array($report, ['balance-sheet', 'profit-and-loss', 'budget'], true),
            404,
            'Unknown report',
        );
    }

    private function authorizeReports(Request $request): void
    {
        abort_unless($request->user()->hasAnyRole(['admin', 'accountant']), 403);
    }
}
