<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Order matters: roles before users, accounts before journals, categories
     * before products. Every seeder is idempotent, so this is safe to re-run.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            ChartOfAccountSeeder::class,
            JournalSeeder::class,
            ProductCategorySeeder::class,
        ]);

        // Login is by login_id. Passwords satisfy the signup policy: >8 chars,
        // one lowercase, one uppercase, one special character.
        // Addresses are real, reachable inboxes on yopmail.com so password
        // reset and Send-by-mail can be demonstrated live. example.com and
        // .test addresses are rejected by the mail provider.
        $admin = User::firstOrCreate(
            ['login_id' => 'adminuser'],
            [
                'name' => 'Urban Furniture Admin',
                'email' => 'admin_ledgercraft@yopmail.com',
                'password' => Hash::make('Admin@123'),
            ],
        );
        $admin->syncRoles(['admin']);

        $accountant = User::firstOrCreate(
            ['login_id' => 'accountant1'],
            [
                'name' => 'Urban Furniture Accountant',
                'email' => 'accountant_ledgercraft@yopmail.com',
                'password' => Hash::make('Account@123'),
            ],
        );
        $accountant->syncRoles(['accountant']);

        // Master data, then opening balances, then the transactions that
        // reference them - see docs/SEEDING.md for why each of these posts
        // through a service rather than a raw insert.
        $this->call([
            ContactSeeder::class,
            ProductSeeder::class,
            AnalyticAccountSeeder::class,
            PortalUserSeeder::class,
            OpeningBalanceSeeder::class,
            BudgetSeeder::class,
            PurchaseDemoSeeder::class,
            SalesDemoSeeder::class,
        ]);
    }
}
