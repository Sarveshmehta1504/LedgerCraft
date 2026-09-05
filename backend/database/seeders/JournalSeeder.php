<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JournalSeeder extends Seeder
{
    /**
     * Depends on ChartOfAccountSeeder - defaults are resolved by account code.
     * Bank and Cash journals point both defaults at their own account, matching
     * the single "Default Account" column on the design board.
     */
    public function run(): void
    {
        $accounts = DB::table('chart_of_accounts')->pluck('id', 'code');

        $journals = [
            [
                'name' => 'Sales Journal',
                'type' => 'sales',
                'default_debit_account' => $accounts['1100'],  // Debtors
                'default_credit_account' => $accounts['4000'], // Sale Income
            ],
            [
                'name' => 'Purchase Journal',
                'type' => 'purchase',
                'default_debit_account' => $accounts['5000'],  // Purchase Expense
                'default_credit_account' => $accounts['2000'], // Creditors
            ],
            [
                'name' => 'Bank Journal',
                'type' => 'bank',
                'default_debit_account' => $accounts['1010'],
                'default_credit_account' => $accounts['1010'],
            ],
            [
                'name' => 'Cash Journal',
                'type' => 'cash',
                'default_debit_account' => $accounts['1000'],
                'default_credit_account' => $accounts['1000'],
            ],
        ];

        foreach ($journals as $journal) {
            DB::table('journals')->updateOrInsert(
                ['type' => $journal['type']],
                $journal + ['created_at' => now(), 'updated_at' => now()],
            );
        }
    }
}
