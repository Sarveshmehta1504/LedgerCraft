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
     * Depends on AnalyticAccountSeeder and ContactSeeder. Achieved amount is
     * derived on read from journal_entry_lines - see docs/DB_SCHEMA.md - so it
     * is never set here; it becomes non-zero once PurchaseDemoSeeder /
     * SalesDemoSeeder post lines tagged with these analytic accounts inside
     * this same period.
     */
    public function run(): void
    {
        $factoryOverheads = $this->analyticAccount('Factory Overheads');
        $onlineSales = $this->analyticAccount('Online Sales Channel');
        $logistics = $this->analyticAccount('Logistics & Delivery');

        $responsibleVendor = $this->contact('Bright Woods Timber Co');
        $responsibleCustomer = $this->contact('Nimesh Patel');
        $responsibleLogistics = $this->contact('Apex Logistics Partners');

        $periodStart = now()->subDays(90)->toDateString();
        $periodEnd = now()->addDays(30)->toDateString();

        Budget::firstOrCreate(
            ['name' => 'Q3 Factory Overheads Budget'],
            [
                'analytic_account_id' => $factoryOverheads->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'committed_amount' => 200000,
                'responsible_id' => $responsibleVendor->id,
                'status' => 'confirmed',
            ],
        );

        Budget::firstOrCreate(
            ['name' => 'Online Sales Growth Target'],
            [
                'analytic_account_id' => $onlineSales->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'committed_amount' => 100000,
                'responsible_id' => $responsibleCustomer->id,
                'status' => 'confirmed',
            ],
        );

        Budget::firstOrCreate(
            ['name' => 'Logistics & Delivery Q3'],
            [
                'analytic_account_id' => $logistics->id,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'committed_amount' => 20000,
                'responsible_id' => $responsibleLogistics->id,
                'status' => 'draft',
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
