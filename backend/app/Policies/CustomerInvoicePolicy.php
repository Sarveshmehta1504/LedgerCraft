<?php

namespace App\Policies;

use App\Models\CustomerInvoice;
use App\Models\User;

/**
 * Transactions are Admin + Accountant only. Portal users never see the
 * purchase side at all.
 */
class CustomerInvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, CustomerInvoice $invoice): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, CustomerInvoice $invoice): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function delete(User $user, CustomerInvoice $invoice): bool
    {
        return $user->hasRole('admin');
    }
}
