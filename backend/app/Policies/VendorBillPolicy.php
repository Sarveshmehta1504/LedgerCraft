<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VendorBill;

/**
 * Transactions are Admin + Accountant only. Portal users never see the
 * purchase side at all.
 */
class VendorBillPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, VendorBill $bill): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, VendorBill $bill): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function delete(User $user, VendorBill $bill): bool
    {
        return $user->hasRole('admin');
    }
}
