<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number', 'sales_order_id', 'contact_id', 'invoice_date',
        'due_date', 'status', 'invoice_reference', 'total', 'journal_entry_id',
    ];

    public const STATUSES = ['draft', 'posted', 'paid'];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'total' => 'decimal:2',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(CustomerInvoiceLine::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'payable_id')
            ->where('payable_type', 'customer_invoice');
    }

    /** Tax-inclusive, like the sales order it came from. */
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
