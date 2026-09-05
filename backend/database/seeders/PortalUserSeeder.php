<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class PortalUserSeeder extends Seeder
{
    /**
     * Customer portal logins, so GET /my/invoices, /my/bills and "pay my dues"
     * can be demonstrated without going through public signup first.
     *
     * Depends on ContactSeeder: every role-`user` account must have a
     * contact_id per docs/DB_SCHEMA.md, and that link is what scopes the portal
     * - PortalController reads it off the authenticated user and never off the
     * request.
     *
     * Three of them, deliberately different from each other:
     *   nimeshp      - an individual with a small, part-paid history
     *   saffrongrand - a corporate account with large overdue balances
     *   zenithco     - a corporate account that is fully settled
     * so the portal can be shown owing money, chasing money, and owing nothing.
     */
    public function run(): void
    {
        $accounts = [
            ['contact' => 'Nimesh Patel', 'login_id' => 'nimeshp', 'password' => 'Nimesh@123'],
            ['contact' => 'Hotel Saffron Grand', 'login_id' => 'saffrongrand', 'password' => 'Saffron@123'],
            ['contact' => 'Zenith Coworking LLP', 'login_id' => 'zenithco', 'password' => 'Zenith@1234'],
        ];

        foreach ($accounts as $account) {
            $contact = Contact::where('name', $account['contact'])->first();

            if ($contact === null) {
                throw new RuntimeException("Contact '{$account['contact']}' not found - run ContactSeeder first");
            }

            $user = User::firstOrCreate(
                ['login_id' => $account['login_id']],
                [
                    // Name and email are taken from the contact, so the portal
                    // account and the ledger record agree on who this is.
                    'name' => $contact->name,
                    'email' => $contact->email,
                    'password' => Hash::make($account['password']),
                    'contact_id' => $contact->id,
                ],
            );

            $user->syncRoles(['user']);

            if ($user->email_verified_at === null) {
                $user->email_verified_at = now()->subDays(45);
                $user->save();
            }
        }
    }
}
