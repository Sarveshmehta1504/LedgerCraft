<?php

namespace App\Models;

use App\Models\Concerns\HasArchive;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Journal extends Model
{
    use HasArchive, HasFactory;

    protected $fillable = [
        'name',
        'type',
        'default_debit_account',
        'default_credit_account',
    ];

    public const TYPES = ['sales', 'purchase', 'bank', 'cash'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    // Column names have no _id suffix - they match docs/DB_SCHEMA.md, which the
    // frontend is built against - so the foreign key must be named explicitly.
    //
    // The relations are deliberately NOT called defaultDebitAccount: that
    // serializes to the key "default_debit_account", which collides with the
    // column of the same name and replaces the id with an object. Naming them
    // debitAccount/creditAccount keeps the documented ids intact and adds
    // "debit_account"/"credit_account" objects alongside them.
    public function debitAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'default_debit_account');
    }

    public function creditAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'default_credit_account');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }
}
