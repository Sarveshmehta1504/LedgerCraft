<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticAccount extends Model
{
    use HasArchive;
    use HasFactory;

    protected $fillable = ['name', 'type'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    public const TYPES = ['income', 'expense'];

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }
}
