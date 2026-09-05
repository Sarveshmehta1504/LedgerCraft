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
        $admin = User::firstOrCreate(
            ['login_id' => 'adminuser'],
            [
                'name' => 'Urban Furniture Admin',
                'email' => 'admin@urbanfurniture.test',
                'password' => Hash::make('Admin@123'),
            ],
        );
        $admin->syncRoles(['admin']);

        $accountant = User::firstOrCreate(
            ['login_id' => 'accountant1'],
            [
                'name' => 'Urban Furniture Accountant',
                'email' => 'accountant@urbanfurniture.test',
                'password' => Hash::make('Account@123'),
            ],
        );
        $accountant->syncRoles(['accountant']);
    }
}
