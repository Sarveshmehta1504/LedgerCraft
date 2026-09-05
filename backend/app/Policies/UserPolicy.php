<?php

namespace App\Policies;

use App\Models\User;

/**
 * User management is Admin-only, per the role matrix in
 * docs/BACKEND_REQUIREMENTS.md. This is the only route to an `admin` or
 * `accountant` account - public signup can never produce one.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function view(User $user, User $target): bool
    {
        return $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function update(User $user, User $target): bool
    {
        return $user->hasRole('admin');
    }

    public function assignRole(User $user, User $target): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, User $target): bool
    {
        // An admin may not delete their own account: it is the quickest way to
        // lock the business out of its own system mid-demo.
        return $user->hasRole('admin') && $user->id !== $target->id;
    }
}
