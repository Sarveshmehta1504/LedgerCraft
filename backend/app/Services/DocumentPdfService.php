<?php

namespace App\Services;

use App\Models\CustomerInvoice;
use App\Models\VendorBill;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\View;

/**
 * Renders invoices, bills and reports to PDF.
 *
 * Figures are read back from the services that own them rather than
 * recalculated here, so a PDF can never disagree with the screen it was
 * printed from.
 */
class DocumentPdfService
{
    public function __construct(
        private readonly VendorBillService $bills,
        private readonly CustomerInvoiceService $invoices,
        private readonly ReportService $reports,
    ) {}

    public function invoice(CustomerInvoice $invoice): \Barryvdh\DomPDF\PDF
    {
        $invoice->load(['contact', 'salesOrder', 'lines.product', 'lines.account', 'lines.analyticAccount']);

        $subtotal = (float) $invoice->lines->sum(fn ($line) => (float) $line->subtotal);

        return Pdf::loadView('pdf.document', [
            'heading' => 'Customer Invoice',
            'number' => $invoice->invoice_number,
            'partyLabel' => 'Bill to',
            'contact' => $invoice->contact,
            'date' => $invoice->invoice_date,
            'dueDate' => $invoice->due_date,
            'reference' => $invoice->invoice_reference,
            'sourceLabel' => $invoice->salesOrder ? 'Sales order' : null,
            'sourceNumber' => $invoice->salesOrder?->number,
            'status' => $invoice->status,
            'lines' => $invoice->lines,
            'showTax' => true,
            'subtotal' => $subtotal,
            'taxTotal' => (float) $invoice->total - $subtotal,
            'total' => $invoice->total,
            'amountPaid' => $this->invoices->amountPaid($invoice),
            'amountDue' => $this->invoices->amountDue($invoice),
        ]);
    }

    public function bill(VendorBill $bill): \Barryvdh\DomPDF\PDF
    {
        $bill->load(['contact', 'purchaseOrder', 'lines.product', 'lines.account', 'lines.analyticAccount']);

        return Pdf::loadView('pdf.document', [
            'heading' => 'Vendor Bill',
            'number' => $bill->bill_number,
            'partyLabel' => 'Bill from',
            'contact' => $bill->contact,
            'date' => $bill->bill_date,
            'dueDate' => $bill->due_date,
            'reference' => $bill->bill_reference,
            'sourceLabel' => $bill->purchaseOrder ? 'Purchase order' : null,
            'sourceNumber' => $bill->purchaseOrder?->number,
            'status' => $bill->status,
            'lines' => $bill->lines,
            // Purchase-side documents have no tax column - the PS omits Tax
            // from the Purchase Order.
            'showTax' => false,
            'subtotal' => (float) $bill->total,
            'taxTotal' => 0.0,
            'total' => $bill->total,
            'amountPaid' => $this->bills->amountPaid($bill),
            'amountDue' => $this->bills->amountDue($bill),
        ]);
    }

    /**
     * @param  'balance-sheet'|'profit-and-loss'|'budget'  $report
     */
    public function report(string $report, array $params = []): \Barryvdh\DomPDF\PDF
    {
        $payload = match ($report) {
            'balance-sheet' => $this->balanceSheetView($params['as_of'] ?? null),
            'profit-and-loss' => $this->profitAndLossView($params['from'] ?? null, $params['to'] ?? null),
            'budget' => $this->budgetView(),
            default => throw new \InvalidArgumentException("Unknown report [{$report}]"),
        };

        return Pdf::loadView('pdf.report', $payload);
    }

    private function balanceSheetView(?string $asOf): array
    {
        $sheet = $this->reports->balanceSheet($asOf);

        return [
            'heading' => 'Balance Sheet',
            'period' => $asOf ? 'As at '.$asOf : 'As at today',
            'sections' => [
                [
                    'title' => 'Assets',
                    'rows' => $this->accountRows($sheet['assets']['accounts']),
                    'total' => ['label' => 'Total assets', 'value' => $sheet['total_assets']],
                ],
                [
                    'title' => 'Liabilities',
                    'rows' => $this->accountRows($sheet['liabilities']['accounts']),
                    'total' => ['label' => 'Total liabilities', 'value' => $sheet['liabilities']['total']],
                ],
                [
                    'title' => 'Capital',
                    'rows' => array_merge($this->accountRows($sheet['capital']['accounts']), [
                        ['label' => 'Retained earnings', 'value' => $sheet['capital']['retained_earnings']],
                    ]),
                    'total' => [
                        'label' => 'Total liabilities and capital',
                        'value' => $sheet['total_liabilities_and_capital'],
                    ],
                ],
            ],
            'footnote' => $sheet['balanced']
                ? 'Assets equal Liabilities plus Capital.'
                : 'WARNING: this balance sheet does not balance.',
        ];
    }

    private function profitAndLossView(?string $from, ?string $to): array
    {
        $pl = $this->reports->profitAndLoss($from, $to);

        return [
            'heading' => 'Profit and Loss',
            'period' => trim(($from ? 'From '.$from.' ' : '').($to ? 'to '.$to : '')) ?: 'All time',
            'sections' => [
                [
                    'title' => 'Income',
                    'rows' => $this->accountRows($pl['income']['accounts']),
                    'total' => ['label' => 'Total income', 'value' => $pl['total_income']],
                ],
                [
                    'title' => 'Expenses',
                    'rows' => array_merge(
                        $this->accountRows($pl['purchase_expense']['accounts']),
                        $this->accountRows($pl['other_expense']['accounts']),
                    ),
                    'total' => ['label' => 'Total expenses', 'value' => $pl['total_expenses']],
                ],
                [
                    'title' => 'Result',
                    'rows' => [],
                    'total' => ['label' => 'Net income', 'value' => $pl['net_income']],
                ],
            ],
        ];
    }

    private function budgetView(): array
    {
        $report = $this->reports->budget();

        return [
            'heading' => 'Budget Report',
            'period' => 'All budgets',
            'sections' => [
                [
                    'title' => 'Budgets',
                    'rows' => array_map(fn ($budget) => [
                        'label' => $budget['name'].' ('.$budget['status'].')',
                        'value' => $budget['achieved_amount'].' of '.$budget['committed_amount'],
                    ], $report['budgets']),
                    'total' => ['label' => 'Total achieved', 'value' => $report['total_achieved'].' of '.$report['total_committed']],
                ],
            ],
            'footnote' => 'Revised and cancelled budgets are listed but excluded from totals.',
        ];
    }

    private function accountRows(array $accounts): array
    {
        return array_map(fn ($account) => [
            'label' => $account['code'].' — '.$account['name'],
            'value' => $account['balance'],
        ], $accounts);
    }

    public function viewExists(string $view): bool
    {
        return View::exists($view);
    }
}
