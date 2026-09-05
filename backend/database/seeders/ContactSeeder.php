<?php

namespace Database\Seeders;

use App\Models\Contact;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    /**
     * Vendors and customers the demo purchase/sales flows transact against.
     * Emails are real yopmail.com inboxes per docs/SEEDING.md - Resend rejects
     * example.com/.test outright, and these are used for invoice/bill "send".
     */
    public function run(): void
    {
        $vendors = [
            ['name' => 'Bright Woods Timber Co', 'email' => 'brightwoods_ledgercraft@yopmail.com', 'mobile' => '9800011001'],
            ['name' => 'Steelcraft Hardware Suppliers', 'email' => 'steelcraft_ledgercraft@yopmail.com', 'mobile' => '9800011002'],
            ['name' => 'EcoFab Raw Materials', 'email' => 'ecofab_ledgercraft@yopmail.com', 'mobile' => '9800011003'],
            ['name' => 'Prime Foam & Upholstery', 'email' => 'primefoam_ledgercraft@yopmail.com', 'mobile' => '9800011004'],
            ['name' => 'Apex Logistics Partners', 'email' => 'apexlogistics_ledgercraft@yopmail.com', 'mobile' => '9800011005'],
        ];

        foreach ($vendors as $vendor) {
            Contact::firstOrCreate(
                ['name' => $vendor['name']],
                [
                    'type' => 'vendor',
                    'email' => $vendor['email'],
                    'mobile' => $vendor['mobile'],
                    'address_city' => 'Ahmedabad',
                    'address_state' => 'Gujarat',
                    'address_country' => 'India',
                ],
            );
        }

        $customers = [
            ['name' => 'Nimesh Patel', 'email' => 'nimeshpatel_ledgercraft@yopmail.com', 'mobile' => '9800022001'],
            ['name' => 'Riya Mehta', 'email' => 'riyamehta_ledgercraft@yopmail.com', 'mobile' => '9800022002'],
            ['name' => 'Kunal Shah', 'email' => 'kunalshah_ledgercraft@yopmail.com', 'mobile' => '9800022003'],
            ['name' => 'Ananya Iyer', 'email' => 'ananyaiyer_ledgercraft@yopmail.com', 'mobile' => '9800022004'],
            ['name' => 'Devika Rao', 'email' => 'devikarao_ledgercraft@yopmail.com', 'mobile' => '9800022005'],
            ['name' => 'Rohan Verma', 'email' => 'rohanverma_ledgercraft@yopmail.com', 'mobile' => '9800022006'],
        ];

        foreach ($customers as $customer) {
            Contact::firstOrCreate(
                ['name' => $customer['name']],
                [
                    'type' => 'customer',
                    'email' => $customer['email'],
                    'mobile' => $customer['mobile'],
                    'address_city' => 'Surat',
                    'address_state' => 'Gujarat',
                    'address_country' => 'India',
                ],
            );
        }

        // Buys raw material and also places bulk furniture orders - exercises
        // the `both` contact type on each side of the ledger.
        Contact::firstOrCreate(
            ['name' => 'Trident Trading Co'],
            [
                'type' => 'both',
                'email' => 'tridenttrading_ledgercraft@yopmail.com',
                'mobile' => '9800033001',
                'address_city' => 'Vadodara',
                'address_state' => 'Gujarat',
                'address_country' => 'India',
            ],
        );
    }
}
