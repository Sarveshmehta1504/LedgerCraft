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
     * A demo-able portal login so GET /my/invoices, /my/bills and paying a
     * dues can be exercised without going through public signup. Depends on
     * ContactSeeder - every role-`user` account must have a contact_id, per
     * docs/DB_SCHEMA.md.
     */
    public function run(): void
    {
        $contact = Contact::where('name', 'Nimesh Patel')->first();

        if ($contact === null) {
            throw new RuntimeException("Contact 'Nimesh Patel' not found - run ContactSeeder first");
        }

        $user = User::firstOrCreate(
            ['login_id' => 'nimeshp'],
            [
                'name' => $contact->name,
                'email' => $contact->email,
                'password' => Hash::make('Nimesh@123'),
                'contact_id' => $contact->id,
            ],
        );

        $user->syncRoles(['user']);
    }
}
