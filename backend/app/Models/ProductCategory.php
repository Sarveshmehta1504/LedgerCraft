<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductCategory extends Model
{
    use HasArchive, HasFactory;

    protected $fillable = ['name', 'parent_id'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    /**
     * A category cannot be its own ancestor. The DB cannot express this, so it
     * is checked here before any parent_id write.
     */
    public function wouldCycle(?int $parentId): bool
    {
        if ($parentId === null) {
            return false;
        }

        if ($parentId === $this->id) {
            return true;
        }

        $seen = [];
        $cursor = self::find($parentId);

        while ($cursor !== null) {
            if ($cursor->id === $this->id || isset($seen[$cursor->id])) {
                return true;
            }
            $seen[$cursor->id] = true;
            $cursor = $cursor->parent;
        }

        return false;
    }
}
