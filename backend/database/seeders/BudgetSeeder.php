<?php

namespace Database\Seeders;

use App\Models\AnalyticAccount;
use App\Models\Budget;
use App\Models\Contact;
use Illuminate\Database\Seeder;
use RuntimeException;

class BudgetSeeder extends Seeder
{
    /**
     * Budgets over two periods: a closed first half and the half currently
     * running.
     *
     * Two periods rather than one because a budget report that only ever shows
     * the current period cannot demonstrate the period filter, and because a
     * closed period is where over- and under-spend actually reads as a result
     * rather than a work in progress.
     *
     * Achieved amount is never stored. It is derived on read by summing posted
     * and paid invoice or bill LINES that carry the same analytic account and
     * fall inside the period (see docs/DB_SCHEMA.md), so these rows only come
     * alive once PurchaseDemoSeeder and SalesDemoSeeder have run. The periods
     * below are pinned to the same window those seeders post into - shift one
     * without the other and every budget reads 0% achieved.
     *
     * All four statuses appear. `revised` and `cancelled` rows stay in the list
     * for history but are excluded from the report totals, which is the whole
     * reason ReportService returns `counted_in_totals` per row.
     */
    public function run(): void
    {
        // The first half is closed; the second is open and runs a month past
        // today, so "amount to achieve" is a live number rather than a verdict.
        $h1 = ['start' => now()->subDays(210)->toDateString(), 'end' => now()->subDays(91)->toDateString()];
        $h2 = ['start' => now()->subDays(90)->toDateString(), 'end' => now()->addDays(30)->toDateString()];

        $budgets = [
            // --- Closed period.
            [
                'name' => 'Factory Overheads - H1 FY26', 'analytic' => 'Factory Overheads', 'period' => $h1,
                'committed' => 500000, 'responsible' => 'Bright Woods Timber Co', 'status' => 'confirmed',
            ],
            [
                'name' => 'Corporate & Bulk Orders - H1 FY26', 'analytic' => 'Corporate & Bulk Orders', 'period' => $h1,
                'committed' => 1500000, 'responsible' => 'Hotel Saffron Grand', 'status' => 'confirmed',
            ],
            [
                // Never confirmed before the period closed - it stayed a plan.
                'name' => 'Logistics & Delivery - H1 FY26', 'analytic' => 'Logistics & Delivery', 'period' => $h1,
                'committed' => 25000, 'responsible' => 'Apex Logistics Partners', 'status' => 'draft',
            ],

            // --- Current period.
            [
                'name' => 'Factory Overheads - H2 FY26', 'analytic' => 'Factory Overheads', 'period' => $h2,
                'committed' => 350000, 'responsible' => 'Bright Woods Timber Co', 'status' => 'confirmed',
            ],
            [
                'name' => 'Logistics & Delivery - H2 FY26', 'analytic' => 'Logistics & Delivery', 'period' => $h2,
                'committed' => 25000, 'responsible' => 'Apex Logistics Partners', 'status' => 'confirmed',
            ],
            [
                // Deliberately under-committed against what was actually spent,
                // so one row on the report is over 100% and the over-budget
                // state is on screen without anyone having to create it.
                'name' => 'Home Expo 2026 Campaign', 'analytic' => 'Marketing & Exhibitions', 'period' => $h2,
                'committed' => 30000, 'responsible' => 'Bright Woods Timber Co', 'status' => 'confirmed',
            ],
            [
                'name' => 'Online Sales Target - H2 FY26', 'analytic' => 'Online Sales Channel', 'period' => $h2,
                'committed' => 200000, 'responsible' => 'Nimesh Patel', 'status' => 'confirmed',
            ],
            [
                'name' => 'Corporate & Bulk Orders - H2 FY26', 'analytic' => 'Corporate & Bulk Orders', 'period' => $h2,
                'committed' => 350000, 'responsible' => 'Zenith Coworking LLP', 'status' => 'confirmed',
            ],
            [
                // Still a proposal - drafts count towards the totals, they just
                // are not committed yet.
                'name' => 'Retail Showroom Target - H2 FY26', 'analytic' => 'Retail Showroom', 'period' => $h2,
                'committed' => 120000, 'responsible' => 'Riya Mehta', 'status' => 'draft',
            ],
            [
                // Abandoned. Stays visible, excluded from totals.
                'name' => 'Delhi Trade Show Stand (cancelled)', 'analytic' => 'Marketing & Exhibitions', 'period' => $h2,
                'committed' => 40000, 'responsible' => 'Apex Logistics Partners', 'status' => 'cancelled',
            ],
        ];

        foreach ($budgets as $budget) {
            $this->budget($budget);
        }

        // A superseded budget and the replacement that supersedes it, so the
        // revision flow is on screen without anyone having to click Revise
        // first. The report lists both and counts only the replacement - which
        // is exactly the case a naive total gets wrong.
        $original = $this->budget([
            'name' => 'Showroom Refit Budget', 'analytic' => 'Showroom Refit', 'period' => $h2,
            'committed' => 90000, 'responsible' => 'Glasscore Interiors Supply', 'status' => 'revised',
        ]);

        $this->budget([
            'name' => 'Showroom Refit Budget - Rev 2', 'analytic' => 'Showroom Refit', 'period' => $h2,
            'committed' => 140000, 'responsible' => 'Glasscore Interiors Supply', 'status' => 'confirmed',
            'revision_of_id' => $original->id,
        ]);
    }

    /** @param  array<string, mixed>  $spec */
    private function budget(array $spec): Budget
    {
        return Budget::firstOrCreate(
            ['name' => $spec['name']],
            [
                'analytic_account_id' => $this->analyticAccount($spec['analytic'])->id,
                'period_start' => $spec['period']['start'],
                'period_end' => $spec['period']['end'],
                'committed_amount' => $spec['committed'],
                'responsible_id' => $this->contact($spec['responsible'])->id,
                'status' => $spec['status'],
                'revision_of_id' => $spec['revision_of_id'] ?? null,
            ],
        );
    }

    private function analyticAccount(string $name): AnalyticAccount
    {
        $account = AnalyticAccount::where('name', $name)->first();

        if ($account === null) {
            throw new RuntimeException("Analytic account '{$name}' not found - run AnalyticAccountSeeder first");
        }

        return $account;
    }

    private function contact(string $name): Contact
    {
        $contact = Contact::where('name', $name)->first();

        if ($contact === null) {
            throw new RuntimeException("Contact '{$name}' not found - run ContactSeeder first");
        }

        return $contact;
    }
}
