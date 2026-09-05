<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerInvoiceLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_invoice_id', 'product_id', 'account_id', 'analytic_account_id',
        'quantity', 'unit_price', 'tax_percent', 'subtotal',
    ];

    /** Derived line figures the UI needs but the table does not store. */
    protected $appends = ['tax_amount', 'line_total'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'tax_percent' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public function customerInvoice(): BelongsTo
    {
        return $this->belongsTo(CustomerInvoice::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function analyticAccount(): BelongsTo
    {
        return $this->belongsTo(AnalyticAccount::class);
    }

    public function getTaxAmountAttribute(): string
    {
        return number_format((float) $this->subtotal * (float) $this->tax_percent / 100, 2, '.', '');
    }

    public function getLineTotalAttribute(): string
    {
        return $this->lineTotal();
    }

    public function lineTotal(): string
    {
        return number_format((float) $this->subtotal + (float) $this->tax_amount, 2, '.', '');
    }
}
