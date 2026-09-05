<?php

namespace App\Policies;

use App\Models\ProductCategory;
use App\Models\User;

class ProductCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function view(User $user, ProductCategory $category): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    /** Categories are created on the fly from the product form. */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function update(User $user, ProductCategory $category): bool
    {
        return $user->hasAnyRole(['admin', 'accountant']);
    }

    public function archive(User $user, ProductCategory $category): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, ProductCategory $category): bool
    {
        return $user->hasRole('admin');
    }
}
