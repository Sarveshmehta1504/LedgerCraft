<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Builds Urban Furniture from nothing to roughly seven months of trading.
     *
     * Order matters: roles before users, accounts before journals, categories
     * before products, contacts before the portal logins that link to them, and
     * the opening balance before any transaction that draws on it. Every seeder
     * is idempotent, so this is safe to re-run on a database that already has
     * data - see docs/SEEDING.md.
     */
    public function run(): void
    {
        $this->call([
            // Configuration: fixed, never created during a demo.
            RoleSeeder::class,
            ChartOfAccountSeeder::class,
            JournalSeeder::class,

            // Back-office logins.
            UserSeeder::class,

            // Master data.
            ProductCategorySeeder::class,
            ProductSeeder::class,
            ContactSeeder::class,
            AnalyticAccountSeeder::class,
            PortalUserSeeder::class,

            // Planning, then the money.
            BudgetSeeder::class,
            OpeningBalanceSeeder::class,
            PurchaseDemoSeeder::class,
            SalesDemoSeeder::class,
        ]);
    }
}
