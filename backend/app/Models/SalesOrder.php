<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SalesOrder extends Model
{
    use HasFactory;

    protected $fillable = ['number', 'contact_id', 'date', 'status', 'total'];

    public const STATUSES = ['draft', 'confirmed', 'invoiced'];

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
        return $this->hasMany(SalesOrderLine::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(CustomerInvoice::class);
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Header total is tax-inclusive: subtotal is quantity * unit_price and the
     * line total adds tax_percent on top. Posting an invoice debits Debtors for
     * this tax-inclusive figure.
     */
    public function recalculateTotal(): void
    {
        $total = 0.0;

        foreach ($this->lines()->get() as $line) {
            $total += (float) $line->lineTotal();
        }

        $this->total = number_format($total, 2, '.', '');
        $this->save();
    }
}
