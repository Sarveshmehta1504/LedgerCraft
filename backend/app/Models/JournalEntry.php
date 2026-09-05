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

    /**
     * Money always renders with two decimals. sum() comes back as a float, so
     * casting it straight to a string yields "2500.5" - which reads as a
     * different amount on an invoice and breaks string comparisons.
     */
    /**
     * The customer or vendor this entry concerns.
     *
     * Not a column: ledger lines carry no contact. The partner is derived by
     * following source_type/source_id to the originating document, which is
     * where the relationship actually lives. Entries with no document (none
     * today) simply have no partner.
     */
    public function partner(): ?Contact
    {
        $document = match ($this->source_type) {
            'vendor_bill' => VendorBill::select('id', 'contact_id')->find($this->source_id),
            'customer_invoice' => CustomerInvoice::select('id', 'contact_id')->find($this->source_id),
            'payment' => Payment::select('id', 'contact_id')->find($this->source_id),
            default => null,
        };

        return $document?->contact;
    }

    public function totalDebit(): string
    {
        return $this->money($this->lines()->sum('debit'));
    }

    public function totalCredit(): string
    {
        return $this->money($this->lines()->sum('credit'));
    }

    public function isBalanced(): bool
    {
        return $this->totalDebit() === $this->totalCredit();
    }

    private function money(mixed $amount): string
    {
        return number_format((float) $amount, 2, '.', '');
    }
}
