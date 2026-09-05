<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalyticAccount extends Model
{
    use HasFactory;

    /** Table carries no timestamp columns - see docs/DB_SCHEMA.md. */
    public $timestamps = false;

    protected $fillable = ['name', 'type'];

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
