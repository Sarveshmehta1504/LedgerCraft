<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = ['number', 'contact_id', 'date', 'status', 'total'];

    public const STATUSES = ['draft', 'confirmed', 'billed'];

    protected function casts(): array
    {
        return ['date' => 'date', 'total' => 'decimal:2'];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PurchaseOrderLine::class);
    }

    public function bill(): HasOne
    {
        return $this->hasOne(VendorBill::class);
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /** Keeps the denormalised header total in step with its lines. */
    public function recalculateTotal(): void
    {
        $this->total = number_format((float) $this->lines()->sum('subtotal'), 2, '.', '');
        $this->save();
    }
}
