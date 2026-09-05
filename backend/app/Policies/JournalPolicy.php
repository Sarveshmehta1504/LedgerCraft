<?php

namespace App\Policies;

use App\Models\Journal;
use App\Models\User;

class JournalPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, Journal $journal): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, Journal $journal): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function archive(User $user, Journal $journal): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, Journal $journal): bool
    {
        return $user->hasRole('admin');
    }
}
