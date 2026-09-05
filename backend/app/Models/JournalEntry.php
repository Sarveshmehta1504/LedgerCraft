<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    use HasFactory;

    /**
     * Entries are immutable audit records: the table has created_at but no
     * updated_at, so Laravel must manage only the former.
     */
    public const UPDATED_AT = null;

    protected $fillable = [
        'journal_id',
        'date',
        'reference',
        'source_type',
        'source_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(Journal::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function totalDebit(): string
    {
        return (string) $this->lines()->sum('debit');
    }

    public function totalCredit(): string
    {
        return (string) $this->lines()->sum('credit');
    }
}
