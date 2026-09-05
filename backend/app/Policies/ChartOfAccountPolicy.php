<?php

namespace App\Policies;

use App\Models\ChartOfAccount;
use App\Models\User;

class ChartOfAccountPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, ChartOfAccount $account): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, ChartOfAccount $account): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function archive(User $user, ChartOfAccount $account): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, ChartOfAccount $account): bool
    {
        return $user->hasRole('admin');
    }
}
