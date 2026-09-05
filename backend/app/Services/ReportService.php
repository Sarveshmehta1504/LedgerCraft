<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\DB;

/**
 * Balance Sheet and Profit & Loss, computed live from journal_entry_lines.
 *
 * Nothing is cached or stored: the reports are a projection of the ledger, so
 * they cannot drift from it. If a number looks wrong, the bug is in the posting
 * logic, not here.
 */
class ReportService
{
    /** Balance = debit - credit for these; credit - debit for the rest. */
    private const DEBIT_NORMAL = ['asset', 'bank', 'cash', 'expense', 'other_expense'];

    private const ASSET_TYPES = ['asset', 'bank', 'cash'];

    /**
     * Income minus expenses over a date range.
     */
    public function profitAndLoss(?string $from = null, ?string $to = null): array
    {
        $income = $this->accountBalances(['income'], $from, $to);
        $expense = $this->accountBalances(['expense'], $from, $to);
        $otherExpense = $this->accountBalances(['other_expense'], $from, $to);

        $incomeTotal = $this->sum($income);
        $expenseTotal = $this->sum($expense);
        $otherExpenseTotal = $this->sum($otherExpense);

        return [
            'period' => ['from' => $from, 'to' => $to],
            'income' => [
                'accounts' => $income,
                'total' => $this->money($incomeTotal),
            ],
            'purchase_expense' => [
                'accounts' => $expense,
                'total' => $this->money($expenseTotal),
            ],
            'other_expense' => [
                'accounts' => $otherExpense,
                'total' => $this->money($otherExpenseTotal),
            ],
            'total_income' => $this->money($incomeTotal),
            'total_expenses' => $this->money($expenseTotal + $otherExpenseTotal),
            'net_income' => $this->money($incomeTotal - $expenseTotal - $otherExpenseTotal),
        ];
    }

    /**
     * Assets versus Liabilities and Capital, as at a date.
     *
     * Net income is carried into the equity side as retained earnings. Without
     * it the two sides cannot balance: income and expense accounts hold the
     * difference, and they are not part of the balance sheet itself.
     */
    public function balanceSheet(?string $asOf = null): array
    {
        $assets = $this->accountBalances(self::ASSET_TYPES, null, $asOf);
        $liabilities = $this->accountBalances(['liability'], null, $asOf);
        $capital = $this->accountBalances(['capital'], null, $asOf);

        $assetTotal = $this->sum($assets);
        $liabilityTotal = $this->sum($liabilities);
        $capitalTotal = $this->sum($capital);

        // Everything earned up to this date, not just the current period.
        $retained = (float) $this->profitAndLoss(null, $asOf)['net_income'];

        $equityAndLiabilities = $liabilityTotal + $capitalTotal + $retained;

        return [
            'as_of' => $asOf,
            'assets' => [
                'accounts' => $assets,
                'total' => $this->money($assetTotal),
            ],
            'liabilities' => [
                'accounts' => $liabilities,
                'total' => $this->money($liabilityTotal),
            ],
            'capital' => [
                'accounts' => $capital,
                'retained_earnings' => $this->money($retained),
                'total' => $this->money($capitalTotal + $retained),
            ],
            'total_assets' => $this->money($assetTotal),
            'total_liabilities_and_capital' => $this->money($equityAndLiabilities),
            // Compared in paise so floating point cannot make a balanced sheet
            // look unbalanced by a rounding artefact.
            'balanced' => (int) round($assetTotal * 100) === (int) round($equityAndLiabilities * 100),
        ];
    }

    /**
     * One row per account of the given types, signed by normal balance.
     * Accounts with no movement are omitted - an empty row is noise.
     *
     * @param  array<int, string>  $types
     */
    private function accountBalances(array $types, ?string $from, ?string $to): array
    {
        $rows = DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_entry_lines.account_id')
            ->whereIn('chart_of_accounts.type', $types)
            ->when($from, fn ($q) => $q->whereDate('journal_entries.date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('journal_entries.date', '<=', $to))
            ->groupBy('chart_of_accounts.id', 'chart_of_accounts.code', 'chart_of_accounts.name', 'chart_of_accounts.type')
            ->orderBy('chart_of_accounts.code')
            ->get([
                'chart_of_accounts.id',
                'chart_of_accounts.code',
                'chart_of_accounts.name',
                'chart_of_accounts.type',
                DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                DB::raw('SUM(journal_entry_lines.credit) as total_credit'),
            ]);

        return $rows->map(function ($row) {
            $debit = (float) $row->total_debit;
            $credit = (float) $row->total_credit;

            $balance = in_array($row->type, self::DEBIT_NORMAL, true)
                ? $debit - $credit
                : $credit - $debit;

            return [
                'id' => $row->id,
                'code' => $row->code,
                'name' => $row->name,
                'type' => $row->type,
                'debit' => $this->money($debit),
                'credit' => $this->money($credit),
                'balance' => $this->money($balance),
            ];
        })->all();
    }

    /** @param array<int, array<string, mixed>> $accounts */
    private function sum(array $accounts): float
    {
        return array_sum(array_map(fn ($a) => (float) $a['balance'], $accounts));
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }

    /** Every account, for a trial-balance style sanity check. */
    public function trialBalance(?string $asOf = null): array
    {
        $accounts = $this->accountBalances(ChartOfAccount::TYPES, null, $asOf);

        $debit = array_sum(array_map(fn ($a) => (float) $a['debit'], $accounts));
        $credit = array_sum(array_map(fn ($a) => (float) $a['credit'], $accounts));

        return [
            'as_of' => $asOf,
            'accounts' => $accounts,
            'total_debit' => $this->money($debit),
            'total_credit' => $this->money($credit),
            'balanced' => (int) round($debit * 100) === (int) round($credit * 100),
        ];
    }
}
