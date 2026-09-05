<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Master data is archived, never hard-deleted, once it has transactions.
 *
 * This is deliberately NOT Laravel's SoftDeletes: the column is `archived_at`,
 * there is no global scope, and relations still resolve archived rows so
 * historical documents keep rendering. Only lists and pickers filter them out.
 */
trait HasArchive
{
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->whereNotNull('archived_at');
    }

    /**
     * Apply the `archived` request filter: absent/0 = active only,
     * 1 = both, "only" = archived only.
     */
    public function scopeArchiveFilter(Builder $query, ?string $filter): Builder
    {
        return match ($filter) {
            '1', 'true', 'all' => $query,
            'only' => $query->archived(),
            default => $query->active(),
        };
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
