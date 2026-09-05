<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorBill extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_number', 'purchase_order_id', 'contact_id', 'bill_date',
        'due_date', 'status', 'bill_reference', 'total', 'journal_entry_id',
    ];

    public const STATUSES = ['draft', 'posted', 'paid'];

    protected function casts(): array
    {
        return [
            'bill_date' => 'date',
            'due_date' => 'date',
            'total' => 'decimal:2',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(VendorBillLine::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'payable_id')
            ->where('payable_type', 'vendor_bill');
    }

    public function recalculateTotal(): void
    {
        $this->total = number_format((float) $this->lines()->sum('subtotal'), 2, '.', '');
        $this->save();
    }
}
