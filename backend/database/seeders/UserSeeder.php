<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Back-office logins: one admin, two accountants and one deactivated
     * account. Portal logins are separate - they need a contact to hang off,
     * so they live in PortalUserSeeder and run after ContactSeeder.
     *
     * Two accountants rather than one because the demo attributes journal
     * entries to whoever posted them: with a single account every row in the
     * ledger says the same name and the "posted by" column looks decorative.
     *
     * Passwords satisfy the policy in App\Rules\StrongPassword - at least 9
     * characters, mixed case, one symbol. Addresses are real yopmail.com
     * inboxes so password reset can be demonstrated live; example.com and
     * .test are rejected by the mail provider outright.
     */
    public function run(): void
    {
        $admin = $this->user(
            'adminuser',
            'Parth Trivedi',
            'admin_ledgercraft@yopmail.com',
            'Admin@123',
        );
        $admin->syncRoles(['admin']);

        $accountant = $this->user(
            'accountant1',
            'Priya Desai',
            'accountant_ledgercraft@yopmail.com',
            'Account@123',
        );
        $accountant->syncRoles(['accountant']);

        $second = $this->user(
            'accountant2',
            'Harsh Bhavsar',
            'accountant2_ledgercraft@yopmail.com',
            'Harsh@1234',
        );
        $second->syncRoles(['accountant']);

        // An accountant who has left. Deactivated rather than deleted, because
        // the journal entries they posted must stay attributable forever - see
        // the note on UserController::destroy. Gives the users list a row in
        // the deactivated state without anyone having to click Deactivate.
        $former = $this->user(
            'exaccountant',
            'Vikram Joshi',
            'vikram_ledgercraft@yopmail.com',
            'Vikram@123',
        );
        $former->syncRoles(['accountant']);

        if (! $former->isDeactivated()) {
            // Not fillable - set through the deactivate action only.
            $former->deactivated_at = now()->subDays(20);
            $former->save();
        }
    }

    private function user(string $loginId, string $name, string $email, string $password): User
    {
        $user = User::firstOrCreate(
            ['login_id' => $loginId],
            [
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
            ],
        );

        // email_verified_at is not fillable, so it is set here rather than
        // passed in. Back-office accounts are created by an admin who has
        // already confirmed the address out of band.
        if ($user->email_verified_at === null) {
            $user->email_verified_at = now()->subDays(120);
            $user->save();
        }

        return $user;
    }
}
