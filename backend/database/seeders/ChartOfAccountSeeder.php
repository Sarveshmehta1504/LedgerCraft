<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChartOfAccountSeeder extends Seeder
{
    /**
     * Accounts are pre-configured, never created during the demo. Covers all
     * eight account types so both reports have every row they need.
     */
    public function run(): void
    {
        $accounts = [
            ['code' => '1000', 'name' => 'Cash',             'type' => 'cash'],
            ['code' => '1010', 'name' => 'Bank',             'type' => 'bank'],
            ['code' => '1100', 'name' => 'Debtors',          'type' => 'asset'],
            ['code' => '2000', 'name' => 'Creditors',        'type' => 'liability'],
            ['code' => '3000', 'name' => 'Capital',          'type' => 'capital'],
            ['code' => '4000', 'name' => 'Sale Income',      'type' => 'income'],
            ['code' => '5000', 'name' => 'Purchase Expense', 'type' => 'expense'],
            ['code' => '6000', 'name' => 'Other Expense',    'type' => 'other_expense'],
        ];

        foreach ($accounts as $account) {
            DB::table('chart_of_accounts')->updateOrInsert(
                ['code' => $account['code']],
                $account + ['created_at' => now(), 'updated_at' => now()],
            );
        }
    }
}
