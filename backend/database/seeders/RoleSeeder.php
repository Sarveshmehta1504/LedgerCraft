<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Three roles, per the design board:
     *  admin      - full access, the only role that can manage users
     *  accountant - master data, transactions, reports (the PS's "Invoicing User")
     *  user       - portal only: own invoices/bills, pay dues (the PS's "Contact")
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['admin', 'accountant', 'user'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
