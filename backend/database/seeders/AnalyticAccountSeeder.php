<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use Illuminate\Database\Seeder;

class AnalyticAccountSeeder extends Seeder
{
    /**
     * Cost/revenue centres that transaction lines and budgets are tagged
     * against - see docs/DB_SCHEMA.md "Entity: analytic_accounts".
     */
    public function run(): void
    {
        $accounts = [
            ['name' => 'Online Sales Channel', 'type' => 'income'],
            ['name' => 'Retail Showroom', 'type' => 'income'],
            ['name' => 'Factory Overheads', 'type' => 'expense'],
            ['name' => 'Logistics & Delivery', 'type' => 'expense'],
        ];

        foreach ($accounts as $account) {
            AnalyticAccount::firstOrCreate(['name' => $account['name']], $account);
        }
    }
}
