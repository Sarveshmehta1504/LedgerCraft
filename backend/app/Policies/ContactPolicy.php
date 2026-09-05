<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    /** A portal user may read only the contact their account is linked to. */
    public function view(User $user, Contact $contact): bool
    {
        return $user->hasAnyRole(['admin', 'accountant'])
            || $user->contact_id === $contact->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, Contact $contact): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    /** Archiving and deleting master data are Admin-only. */
    public function archive(User $user, Contact $contact): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->hasRole('admin');
    }
}
