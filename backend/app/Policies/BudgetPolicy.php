<?php

namespace App\Policies;

use App\Models\Budget;
use App\Models\User;

class BudgetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, Budget $budget): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, Budget $budget): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function archive(User $user, Budget $budget): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, Budget $budget): bool
    {
        return $user->hasRole('admin');
    }
}
