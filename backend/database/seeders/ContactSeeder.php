<?php

namespace Database\Seeders;

use App\Models\Contact;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    /**
     * The people and companies Urban Furniture trades with: eight suppliers,
     * nine buyers, two that are both, and one archived supplier.
     *
     * Every optional column is populated - full street address, PIN, mobile and
     * avatar - because a contacts screen with half its fields blank reads as
     * unfinished on a demo. Cities are spread across five states so the list
     * does not look like one row copy-pasted twenty times.
     *
     * Emails are real yopmail.com inboxes per docs/SEEDING.md: Resend rejects
     * example.com and .test outright, and these addresses receive the "send
     * invoice by mail" and password-reset messages during the demo.
     */
    public function run(): void
    {
        foreach ($this->vendors() as $row) {
            $this->contact($row, 'vendor');
        }

        foreach ($this->customers() as $row) {
            $this->contact($row, 'customer');
        }

        foreach ($this->both() as $row) {
            $this->contact($row, 'both');
        }

        // A supplier the company stopped using. Archived rather than deleted -
        // its old bills must still render - so the archive filter on the
        // contacts list has something to hide.
        $retired = $this->contact([
            'name' => 'Old Oak Furnishings',
            'email' => 'oldoak_ledgercraft@yopmail.com',
            'mobile' => '9800011099',
            'street' => '7, Kalupur Timber Market',
            'city' => 'Ahmedabad',
            'state' => 'Gujarat',
            'pin' => '380002',
            'initials' => 'OO',
            'colour' => '78716c',
        ], 'vendor');

        if (! $retired->isArchived()) {
            // archived_at is not fillable - it is set through the archive
            // action, never mass-assigned.
            $retired->archived_at = now()->subDays(120);
            $retired->save();
        }
    }

    /** @return array<int, array<string, string>> */
    private function vendors(): array
    {
        return [
            ['name' => 'Bright Woods Timber Co', 'email' => 'brightwoods_ledgercraft@yopmail.com', 'mobile' => '9800011001', 'street' => '14, Sarkhej Timber Yard, S G Highway', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'pin' => '380015', 'initials' => 'BW', 'colour' => '92400e'],
            ['name' => 'Steelcraft Hardware Suppliers', 'email' => 'steelcraft_ledgercraft@yopmail.com', 'mobile' => '9800011002', 'street' => 'Plot 22, Aji GIDC Industrial Estate', 'city' => 'Rajkot', 'state' => 'Gujarat', 'pin' => '360003', 'initials' => 'SH', 'colour' => '3f3f46'],
            ['name' => 'EcoFab Raw Materials', 'email' => 'ecofab_ledgercraft@yopmail.com', 'mobile' => '9800011003', 'street' => 'B-9, Pandesara Textile Zone', 'city' => 'Surat', 'state' => 'Gujarat', 'pin' => '395023', 'initials' => 'EF', 'colour' => '15803d'],
            ['name' => 'Prime Foam & Upholstery', 'email' => 'primefoam_ledgercraft@yopmail.com', 'mobile' => '9800011004', 'street' => '31, GIDC Phase II, Chhiri', 'city' => 'Vapi', 'state' => 'Gujarat', 'pin' => '396195', 'initials' => 'PF', 'colour' => '9333ea'],
            ['name' => 'Apex Logistics Partners', 'email' => 'apexlogistics_ledgercraft@yopmail.com', 'mobile' => '9800011005', 'street' => '5th Floor, Titanium Square, Thaltej', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'pin' => '380059', 'initials' => 'AL', 'colour' => '0369a1'],
            ['name' => 'Glasscore Interiors Supply', 'email' => 'glasscore_ledgercraft@yopmail.com', 'mobile' => '9800011006', 'street' => 'Survey 118, Lakhdhirpur Road', 'city' => 'Morbi', 'state' => 'Gujarat', 'pin' => '363641', 'initials' => 'GI', 'colour' => '0d9488'],
            ['name' => 'Nakoda Polish & Coatings', 'email' => 'nakoda_ledgercraft@yopmail.com', 'mobile' => '9800011007', 'street' => 'Shed 4, Narol Industrial Area', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'pin' => '382405', 'initials' => 'NC', 'colour' => 'b45309'],
            ['name' => 'Vertex Power Solutions', 'email' => 'vertexpower_ledgercraft@yopmail.com', 'mobile' => '9800011008', 'street' => 'C-2, Infocity Business Park', 'city' => 'Gandhinagar', 'state' => 'Gujarat', 'pin' => '382007', 'initials' => 'VP', 'colour' => 'ca8a04'],
        ];
    }

    /** @return array<int, array<string, string>> */
    private function customers(): array
    {
        return [
            ['name' => 'Nimesh Patel', 'email' => 'nimeshpatel_ledgercraft@yopmail.com', 'mobile' => '9800022001', 'street' => '402, Silver Heights, Adajan', 'city' => 'Surat', 'state' => 'Gujarat', 'pin' => '395009', 'initials' => 'NP', 'colour' => '1d4ed8'],
            ['name' => 'Riya Mehta', 'email' => 'riyamehta_ledgercraft@yopmail.com', 'mobile' => '9800022002', 'street' => '17, Alkapuri Society, R C Dutt Road', 'city' => 'Vadodara', 'state' => 'Gujarat', 'pin' => '390007', 'initials' => 'RM', 'colour' => 'be185d'],
            ['name' => 'Kunal Shah', 'email' => 'kunalshah_ledgercraft@yopmail.com', 'mobile' => '9800022003', 'street' => 'B-1204, Iscon Platinum, Bopal', 'city' => 'Ahmedabad', 'state' => 'Gujarat', 'pin' => '380058', 'initials' => 'KS', 'colour' => '4338ca'],
            ['name' => 'Ananya Iyer', 'email' => 'ananyaiyer_ledgercraft@yopmail.com', 'mobile' => '9800022004', 'street' => '9, Koregaon Park Lane 5', 'city' => 'Pune', 'state' => 'Maharashtra', 'pin' => '411001', 'initials' => 'AI', 'colour' => '0f766e'],
            ['name' => 'Devika Rao', 'email' => 'devikarao_ledgercraft@yopmail.com', 'mobile' => '9800022005', 'street' => '221, 12th Main, Indiranagar', 'city' => 'Bengaluru', 'state' => 'Karnataka', 'pin' => '560038', 'initials' => 'DR', 'colour' => 'c2410c'],
            ['name' => 'Rohan Verma', 'email' => 'rohanverma_ledgercraft@yopmail.com', 'mobile' => '9800022006', 'street' => '55, Civil Lines, Ashok Marg', 'city' => 'Jaipur', 'state' => 'Rajasthan', 'pin' => '302006', 'initials' => 'RV', 'colour' => '7c3aed'],
            ['name' => 'Meera Krishnan', 'email' => 'meerak_ledgercraft@yopmail.com', 'mobile' => '9800022007', 'street' => 'Villa 6, Panampilly Nagar', 'city' => 'Kochi', 'state' => 'Kerala', 'pin' => '682036', 'initials' => 'MK', 'colour' => '047857'],
            // Two corporate buyers. They order in bulk, they are the ones with
            // credit terms worth chasing on the aging report, and each holds a
            // portal login so the portal is not demonstrated on a single account.
            ['name' => 'Hotel Saffron Grand', 'email' => 'saffrongrand_ledgercraft@yopmail.com', 'mobile' => '9800022008', 'street' => 'Lake Palace Road, Near Gangaur Ghat', 'city' => 'Udaipur', 'state' => 'Rajasthan', 'pin' => '313001', 'initials' => 'HS', 'colour' => 'b91c1c'],
            ['name' => 'Zenith Coworking LLP', 'email' => 'zenithco_ledgercraft@yopmail.com', 'mobile' => '9800022009', 'street' => '8th Floor, Peninsula Business Park, Lower Parel', 'city' => 'Mumbai', 'state' => 'Maharashtra', 'pin' => '400013', 'initials' => 'ZC', 'colour' => '1e293b'],
        ];
    }

    /**
     * Contacts on both sides of the ledger: they supply raw material and also
     * place furniture orders, so the same contact appears in the vendor picker
     * and the customer picker.
     *
     * @return array<int, array<string, string>>
     */
    private function both(): array
    {
        return [
            ['name' => 'Trident Trading Co', 'email' => 'tridenttrading_ledgercraft@yopmail.com', 'mobile' => '9800033001', 'street' => '3, Makarpura GIDC Road', 'city' => 'Vadodara', 'state' => 'Gujarat', 'pin' => '390010', 'initials' => 'TT', 'colour' => '0891b2'],
            ['name' => 'Sahyadri Interiors', 'email' => 'sahyadri_ledgercraft@yopmail.com', 'mobile' => '9800033002', 'street' => '24, Gangapur Road, Near Shivaji Chowk', 'city' => 'Nashik', 'state' => 'Maharashtra', 'pin' => '422013', 'initials' => 'SI', 'colour' => '65a30d'],
        ];
    }

    /** @param  array<string, string>  $row */
    private function contact(array $row, string $type): Contact
    {
        return Contact::firstOrCreate(
            ['name' => $row['name']],
            [
                'type' => $type,
                'email' => $row['email'],
                'mobile' => $row['mobile'],
                'address_street' => $row['street'],
                'address_city' => $row['city'],
                'address_state' => $row['state'],
                'address_country' => 'India',
                'address_pin' => $row['pin'],
                'profile_image' => $this->avatar($row['initials'], $row['colour']),
            ],
        );
    }

    /**
     * An inline SVG avatar, so the contacts list shows real images without the
     * demo depending on previously uploaded files or an internet connection.
     *
     * It has to be a data URI rather than a path: profile_image holds whatever
     * string the upload endpoint returned, and nothing has been uploaded on a
     * freshly seeded machine, so a path would render as a broken image.
     * Kept terse on purpose - the column is varchar(255) and this lands at 219.
     */
    private function avatar(string $initials, string $colour): string
    {
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>"
            ."<rect width='48' height='48' rx='8' fill='%23{$colour}'/>"
            ."<text x='24' y='31' font-size='18' fill='%23fff' text-anchor='middle'>{$initials}</text></svg>";
    }
}
