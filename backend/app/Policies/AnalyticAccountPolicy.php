<?php

namespace App\Policies;

use App\Models\AnalyticAccount;
use App\Models\User;

class AnalyticAccountPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, AnalyticAccount $analyticAccount): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, AnalyticAccount $analyticAccount): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function archive(User $user, AnalyticAccount $analyticAccount): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, AnalyticAccount $analyticAccount): bool
    {
        return $user->hasRole('admin');
    }
}
