<?php

namespace App\Services;

use App\Models\Budget;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Budget lifecycle: draft -> confirmed -> revised | cancelled.
 *
 * Achieved amounts are never stored. They are summed live from document lines
 * carrying the budget's analytic account inside its period:
 *
 *   income  analytic -> customer invoice lines
 *   expense analytic -> vendor bill lines
 *
 * Only posted and paid documents count. A draft has not hit the ledger, so
 * counting it would let an unposted invoice inflate the numbers.
 */
class BudgetService
{
    private const COUNTED_STATUSES = ['posted', 'paid'];

    public function create(array $data): Budget
    {
        return Budget::create($data + ['status' => 'draft']);
    }

    public function update(Budget $budget, array $data): Budget
    {
        if ($budget->status !== 'draft') {
            throw new RuntimeException("A {$budget->status} budget cannot be edited");
        }

        $budget->update($data);

        return $budget->fresh();
    }

    public function confirm(Budget $budget): Budget
    {
        if ($budget->status !== 'draft') {
            throw new RuntimeException("A {$budget->status} budget cannot be confirmed");
        }

        $budget->status = 'confirmed';
        $budget->save();

        return $budget->fresh();
    }

    /**
     * Revising creates a NEW budget and moves the original to `revised`, so the
     * original figure stays on record rather than being overwritten. The new
     * one keeps the original name with "Revised" appended and links back.
     */
    public function revise(Budget $budget, array $data): Budget
    {
        if ($budget->status !== 'confirmed') {
            throw new RuntimeException('Only a confirmed budget can be revised');
        }

        return DB::transaction(function () use ($budget, $data) {
            $revision = Budget::create([
                'name' => $data['name'] ?? $budget->name.' Revised',
                'analytic_account_id' => $data['analytic_account_id'] ?? $budget->analytic_account_id,
                'period_start' => $data['period_start'] ?? $budget->period_start,
                'period_end' => $data['period_end'] ?? $budget->period_end,
                'committed_amount' => $data['committed_amount'] ?? $budget->committed_amount,
                'responsible_id' => $data['responsible_id'] ?? $budget->responsible_id,
                'status' => 'confirmed',
                'revision_of_id' => $budget->id,
            ]);

            $budget->status = 'revised';
            $budget->save();

            return $revision->fresh(['analyticAccount', 'responsible', 'revisionOf']);
        });
    }

    public function cancel(Budget $budget): Budget
    {
        if ($budget->status === 'cancelled') {
            throw new RuntimeException('This budget is already cancelled');
        }

        if ($budget->status === 'revised') {
            throw new RuntimeException('A revised budget cannot be cancelled - cancel its revision instead');
        }

        $budget->status = 'cancelled';
        $budget->save();

        return $budget->fresh();
    }

    /**
     * Committed, achieved, achieved % and amount-to-achieve for one budget.
     */
    public function figures(Budget $budget): array
    {
        $committed = (float) $budget->committed_amount;
        $achieved = (float) $this->achievedAmount($budget);

        return [
            'committed_amount' => $this->money($committed),
            'achieved_amount' => $this->money($achieved),
            'achieved_percent' => $committed <= 0.0 ? null : round($achieved / $committed * 100, 2),
            'amount_to_achieve' => $this->money($committed - $achieved),
        ];
    }

    /**
     * Sum of matching document lines within the budget period. Lines are joined
     * to their parent document so both the status and the document date can be
     * filtered - a line has neither of its own.
     */
    public function achievedAmount(Budget $budget): string
    {
        $income = $budget->analyticAccount?->type === 'income';

        $total = $income
            ? DB::table('customer_invoice_lines')
                ->join('customer_invoices', 'customer_invoices.id', '=', 'customer_invoice_lines.customer_invoice_id')
                ->where('customer_invoice_lines.analytic_account_id', $budget->analytic_account_id)
                ->whereIn('customer_invoices.status', self::COUNTED_STATUSES)
                ->whereBetween('customer_invoices.invoice_date', [$budget->period_start, $budget->period_end])
                ->sum('customer_invoice_lines.subtotal')
            : DB::table('vendor_bill_lines')
                ->join('vendor_bills', 'vendor_bills.id', '=', 'vendor_bill_lines.vendor_bill_id')
                ->where('vendor_bill_lines.analytic_account_id', $budget->analytic_account_id)
                ->whereIn('vendor_bills.status', self::COUNTED_STATUSES)
                ->whereBetween('vendor_bills.bill_date', [$budget->period_start, $budget->period_end])
                ->sum('vendor_bill_lines.subtotal');

        return $this->money((float) $total);
    }

    /**
     * The documents behind an achieved figure - what the design board opens
     * when the Achieved Amount is clicked.
     */
    public function achievedDocuments(Budget $budget): array
    {
        $income = $budget->analyticAccount?->type === 'income';

        $rows = $income
            ? DB::table('customer_invoice_lines')
                ->join('customer_invoices', 'customer_invoices.id', '=', 'customer_invoice_lines.customer_invoice_id')
                ->join('contacts', 'contacts.id', '=', 'customer_invoices.contact_id')
                ->where('customer_invoice_lines.analytic_account_id', $budget->analytic_account_id)
                ->whereIn('customer_invoices.status', self::COUNTED_STATUSES)
                ->whereBetween('customer_invoices.invoice_date', [$budget->period_start, $budget->period_end])
                ->get([
                    'customer_invoices.id',
                    'customer_invoices.invoice_number as number',
                    'customer_invoices.invoice_date as date',
                    'customer_invoices.status',
                    'contacts.name as contact_name',
                    'customer_invoice_lines.subtotal as amount',
                ])
            : DB::table('vendor_bill_lines')
                ->join('vendor_bills', 'vendor_bills.id', '=', 'vendor_bill_lines.vendor_bill_id')
                ->join('contacts', 'contacts.id', '=', 'vendor_bills.contact_id')
                ->where('vendor_bill_lines.analytic_account_id', $budget->analytic_account_id)
                ->whereIn('vendor_bills.status', self::COUNTED_STATUSES)
                ->whereBetween('vendor_bills.bill_date', [$budget->period_start, $budget->period_end])
                ->get([
                    'vendor_bills.id',
                    'vendor_bills.bill_number as number',
                    'vendor_bills.bill_date as date',
                    'vendor_bills.status',
                    'contacts.name as contact_name',
                    'vendor_bill_lines.subtotal as amount',
                ]);

        return [
            'document_type' => $income ? 'customer_invoice' : 'vendor_bill',
            'documents' => $rows->all(),
        ];
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }
}
