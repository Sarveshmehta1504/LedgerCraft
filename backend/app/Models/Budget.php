<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'analytic_account_id',
        'period_start',
        'period_end',
        'committed_amount',
        'responsible_id',
        'status',
        'revision_of_id',
    ];

    public const STATUSES = ['draft', 'confirmed', 'revised', 'cancelled'];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'committed_amount' => 'decimal:2',
        ];
    }

    public function analyticAccount(): BelongsTo
    {
        return $this->belongsTo(AnalyticAccount::class);
    }

    /** Responsible person is picked from the Contacts master. */
    public function responsible(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'responsible_id');
    }

    public function revisionOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'revision_of_id');
    }
}
