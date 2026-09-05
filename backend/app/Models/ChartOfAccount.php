<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasArchive, HasFactory;

    protected $table = 'chart_of_accounts';

    protected $fillable = ['code', 'name', 'type'];

    /** The eight account types. */
    public const TYPES = [
        'asset',
        'liability',
        'bank',
        'capital',
        'cash',
        'income',
        'expense',
        'other_expense',
    ];

    /** Balance = debit - credit for these; credit - debit for the rest. */
    public const DEBIT_NORMAL = ['asset', 'bank', 'cash', 'expense', 'other_expense'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    public function isDebitNormal(): bool
    {
        return in_array($this->type, self::DEBIT_NORMAL, true);
    }
}
