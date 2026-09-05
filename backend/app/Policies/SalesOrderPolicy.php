<?php

namespace App\Policies;

use App\Models\SalesOrder;
use App\Models\User;

/**
 * Transactions are Admin + Accountant only. Portal users never see the
 * purchase side at all.
 */
class SalesOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, SalesOrder $order): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, SalesOrder $order): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function delete(User $user, SalesOrder $order): bool
    {
        return $user->hasRole('admin');
    }
}
