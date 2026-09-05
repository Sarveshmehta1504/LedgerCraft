<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Dashboard KPIs and AR/AP ageing.
 *
 * Kept apart from the statutory reports (Balance Sheet, P&L) because these are
 * operational views: they read documents and payments rather than the ledger,
 * and they answer "who owes us money" rather than "what are we worth".
 */
trait BuildsOperationalReports
{
    public function dashboard(): array
    {
        $balances = collect($this->accountBalances(['asset', 'bank', 'cash'], null, null))->keyBy('type');
        $pl = $this->profitAndLoss();

        $receivable = $this->outstanding('customer_invoices', 'customer_invoice');
        $payable = $this->outstanding('vendor_bills', 'vendor_bill');

        return [
            'cash' => $balances['cash']['balance'] ?? '0.00',
            'bank' => $balances['bank']['balance'] ?? '0.00',
            'total_receivable' => $receivable['outstanding'],
            'total_payable' => $payable['outstanding'],
            'overdue_receivable' => $receivable['overdue'],
            'overdue_payable' => $payable['overdue'],
            'net_income' => $pl['net_income'],
            'total_income' => $pl['total_income'],
            'total_expenses' => $pl['total_expenses'],
            'counts' => [
                'purchase_orders' => DB::table('purchase_orders')->count(),
                'sales_orders' => DB::table('sales_orders')->count(),
                'vendor_bills_unpaid' => DB::table('vendor_bills')->where('status', 'posted')->count(),
                'customer_invoices_unpaid' => DB::table('customer_invoices')->where('status', 'posted')->count(),
                'contacts' => DB::table('contacts')->whereNull('archived_at')->count(),
                'products' => DB::table('products')->whereNull('archived_at')->count(),
            ],
            'top_customers' => $this->topCustomers(),
        ];
    }

    /**
     * Only posted documents age: a draft has not been issued, and a paid one
     * has no balance left to chase.
     */
    public function aging(?string $asOf = null): array
    {
        $asOf ??= now()->toDateString();

        return [
            'as_of' => $asOf,
            'receivable' => $this->agingFor('customer_invoices', 'customer_invoice', 'invoice_number', 'invoice_date', $asOf),
            'payable' => $this->agingFor('vendor_bills', 'vendor_bill', 'bill_number', 'bill_date', $asOf),
        ];
    }

    private function agingFor(
        string $table,
        string $payableType,
        string $numberColumn,
        string $dateColumn,
        string $asOf,
    ): array {
        $documents = DB::table($table)
            ->join('contacts', 'contacts.id', '=', $table.'.contact_id')
            ->where($table.'.status', 'posted')
            ->whereDate($table.'.'.$dateColumn, '<=', $asOf)
            ->get([
                $table.'.id',
                $table.'.'.$numberColumn.' as number',
                $table.'.'.$dateColumn.' as date',
                $table.'.due_date',
                $table.'.total',
                'contacts.name as contact_name',
            ]);

        $buckets = ['current' => 0.0, '1_30' => 0.0, '31_60' => 0.0, '61_90' => 0.0, '90_plus' => 0.0];
        $rows = [];

        foreach ($documents as $document) {
            $balance = (float) $document->total - $this->paidOn($payableType, $document->id);

            if (round($balance, 2) <= 0.0) {
                continue;
            }

            // A document with no due date is never overdue - there is nothing
            // for it to be late against.
            $daysOverdue = $document->due_date === null
                ? 0
                : max(0, (int) floor((strtotime($asOf) - strtotime((string) $document->due_date)) / 86400));

            $bucket = match (true) {
                $daysOverdue <= 0 => 'current',
                $daysOverdue <= 30 => '1_30',
                $daysOverdue <= 60 => '31_60',
                $daysOverdue <= 90 => '61_90',
                default => '90_plus',
            };

            $buckets[$bucket] += $balance;

            $rows[] = [
                'id' => $document->id,
                'number' => $document->number,
                'contact_name' => $document->contact_name,
                'date' => $document->date,
                'due_date' => $document->due_date,
                'total' => $this->money((float) $document->total),
                'balance' => $this->money($balance),
                'days_overdue' => $daysOverdue,
                'bucket' => $bucket,
            ];
        }

        return [
            'buckets' => array_map(fn ($value) => $this->money($value), $buckets),
            'total' => $this->money(array_sum($buckets)),
            'documents' => $rows,
        ];
    }

    private function outstanding(string $table, string $payableType): array
    {
        $documents = DB::table($table)->where('status', 'posted')->get(['id', 'total', 'due_date']);

        $outstanding = 0.0;
        $overdue = 0.0;
        $today = now()->toDateString();

        foreach ($documents as $document) {
            $balance = (float) $document->total - $this->paidOn($payableType, $document->id);

            if (round($balance, 2) <= 0.0) {
                continue;
            }

            $outstanding += $balance;

            if ($document->due_date !== null && $document->due_date < $today) {
                $overdue += $balance;
            }
        }

        return ['outstanding' => $this->money($outstanding), 'overdue' => $this->money($overdue)];
    }

    private function paidOn(string $payableType, int $payableId): float
    {
        return (float) DB::table('payments')
            ->where('payable_type', $payableType)
            ->where('payable_id', $payableId)
            ->sum('amount');
    }

    private function topCustomers(int $limit = 5): array
    {
        return DB::table('customer_invoices')
            ->join('contacts', 'contacts.id', '=', 'customer_invoices.contact_id')
            ->whereIn('customer_invoices.status', ['posted', 'paid'])
            ->groupBy('contacts.id', 'contacts.name')
            ->orderByDesc(DB::raw('SUM(customer_invoices.total)'))
            ->limit($limit)
            ->get(['contacts.id', 'contacts.name', DB::raw('SUM(customer_invoices.total) as revenue')])
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'revenue' => $this->money((float) $row->revenue),
            ])
            ->all();
    }
}
