<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use Illuminate\Database\Seeder;

class AnalyticAccountSeeder extends Seeder
{
    /**
     * Cost and revenue centres that transaction lines and budgets are tagged
     * against - see docs/DB_SCHEMA.md "Entity: analytic_accounts".
     *
     * Three of each type, so the analytic report has more than one row per
     * side and the income/expense split is visible at a glance. These are the
     * dimensions the business actually manages by: where revenue comes from,
     * and where money goes that is not a direct material cost.
     */
    public function run(): void
    {
        $accounts = [
            ['name' => 'Online Sales Channel', 'type' => 'income'],
            ['name' => 'Retail Showroom', 'type' => 'income'],
            ['name' => 'Corporate & Bulk Orders', 'type' => 'income'],
            ['name' => 'Factory Overheads', 'type' => 'expense'],
            ['name' => 'Logistics & Delivery', 'type' => 'expense'],
            ['name' => 'Marketing & Exhibitions', 'type' => 'expense'],
            // A one-off capital project. It gets its own centre rather than
            // sharing Factory Overheads because achieved amount is derived per
            // analytic account and period: two live budgets on the same pair
            // would each claim the whole spend, and the report total would
            // count it twice.
            ['name' => 'Showroom Refit', 'type' => 'expense'],
        ];

        foreach ($accounts as $account) {
            AnalyticAccount::firstOrCreate(['name' => $account['name']], $account);
        }

        // A closed initiative. Its historical lines still resolve, but it is
        // out of the picker - which is the whole point of archiving rather
        // than deleting a cost centre that has postings against it.
        $closed = AnalyticAccount::firstOrCreate(
            ['name' => 'Pilot Kiosk Programme'],
            ['type' => 'income'],
        );

        if (! $closed->isArchived()) {
            $closed->archived_at = now()->subDays(60);
            $closed->save();
        }
    }
}
