<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\Journal;
use App\Models\Payment;
use App\Models\VendorBill;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Vendor bill lifecycle: draft -> posted -> paid.
 *
 * Posting and paying both create journal entries, and both do so through
 * JournalEntryService so the balance invariant is enforced in one place.
 */
class VendorBillService
{
    public function __construct(
        private readonly JournalEntryService $journalEntries,
        private readonly DocumentNumberService $numbers,
    ) {}

    public function create(array $data): VendorBill
    {
        return DB::transaction(function () use ($data) {
            $bill = VendorBill::create([
                'bill_number' => $this->numbers->vendorBill(),
                'purchase_order_id' => $data['purchase_order_id'] ?? null,
                'contact_id' => $data['contact_id'],
                'bill_date' => $data['bill_date'],
                'due_date' => $data['due_date'] ?? null,
                'bill_reference' => $data['bill_reference'] ?? null,
                'status' => 'draft',
                'total' => 0,
            ]);

            $this->replaceLines($bill, $data['lines']);

            return $bill->load('lines', 'contact');
        });
    }

    public function update(VendorBill $bill, array $data): VendorBill
    {
        if ($bill->status !== 'draft') {
            throw new RuntimeException('Only a draft bill can be edited');
        }

        return DB::transaction(function () use ($bill, $data) {
            $bill->fill(array_intersect_key($data, array_flip([
                'contact_id', 'bill_date', 'due_date', 'bill_reference',
            ])))->save();

            if (isset($data['lines'])) {
                $this->replaceLines($bill, $data['lines']);
            }

            return $bill->fresh(['lines', 'contact']);
        });
    }

    /**
     * Posting creates the double entry: Debit Purchase Expense, Credit
     * Creditors/AP, for the bill total.
     */
    public function post(VendorBill $bill, int $userId): VendorBill
    {
        if ($bill->status !== 'draft') {
            throw new RuntimeException("A {$bill->status} bill cannot be posted again");
        }

        if ($bill->lines()->count() === 0) {
            throw new RuntimeException('A bill needs at least one line before it can be posted');
        }

        return DB::transaction(function () use ($bill, $userId) {
            $entry = $this->journalEntries->postDoubleEntry(
                journalId: $this->journal('purchase')->id,
                date: $bill->bill_date,
                sourceType: 'vendor_bill',
                sourceId: $bill->id,
                debitAccountId: $this->account('expense')->id,
                creditAccountId: $this->account('liability')->id,
                amount: $bill->total,
                reference: $bill->bill_number,
                createdBy: $userId,
            );

            $bill->status = 'posted';
            $bill->journal_entry_id = $entry->id;
            $bill->save();

            return $bill->fresh(['lines', 'contact', 'journalEntry.lines']);
        });
    }

    /**
     * Registering a payment: Debit Creditors/AP, Credit Cash/Bank. When the
     * bill is fully paid its status flips to `paid`.
     */
    public function registerPayment(VendorBill $bill, array $data, int $userId): Payment
    {
        if ($bill->status === 'draft') {
            throw new RuntimeException('Post the bill before registering a payment');
        }

        if ($bill->status === 'paid') {
            throw new RuntimeException('This bill is already fully paid');
        }

        $amount = (float) $data['amount'];
        $due = (float) $this->amountDue($bill);

        if ($amount <= 0) {
            throw new RuntimeException('Payment amount must be greater than zero');
        }

        // Overpaying a bill would put the ledger out of step with reality and
        // leave a credit nothing in P0 scope knows how to hold.
        if (round($amount, 2) > round($due, 2)) {
            throw new RuntimeException(
                'Payment of '.number_format($amount, 2).' exceeds the amount due of '.number_format($due, 2)
            );
        }

        $via = $data['payment_via'] ?? 'bank';

        return DB::transaction(function () use ($bill, $data, $amount, $via, $userId) {
            $journal = $this->journal($via);
            $cashOrBank = $this->account($via === 'cash' ? 'cash' : 'bank');

            $date = $data['date'] ?? now()->toDateString();

            // The payment row is created first so the journal entry can point
            // at a real source_id from the outset, rather than a placeholder
            // that is patched up afterwards.
            $payment = Payment::create([
                'contact_id' => $bill->contact_id,
                'payment_type' => 'send',
                'payable_type' => 'vendor_bill',
                'payable_id' => $bill->id,
                'payment_via' => $via,
                'journal_id' => $journal->id,
                'amount' => $amount,
                'date' => $date,
                'note' => $data['note'] ?? null,
            ]);

            $entry = $this->journalEntries->postDoubleEntry(
                journalId: $journal->id,
                date: $date,
                sourceType: 'payment',
                sourceId: $payment->id,
                debitAccountId: $this->account('liability')->id,
                creditAccountId: $cashOrBank->id,
                amount: $amount,
                reference: $bill->bill_number,
                createdBy: $userId,
            );

            $payment->journal_entry_id = $entry->id;
            $payment->save();

            if (round((float) $this->amountDue($bill->fresh()), 2) <= 0.0) {
                $bill->status = 'paid';
                $bill->save();
            }

            return $payment->load('journalEntry.lines');
        });
    }

    public function amountPaid(VendorBill $bill): string
    {
        $paid = Payment::where('payable_type', 'vendor_bill')
            ->where('payable_id', $bill->id)
            ->sum('amount');

        return number_format((float) $paid, 2, '.', '');
    }

    public function amountDue(VendorBill $bill): string
    {
        return number_format((float) $bill->total - (float) $this->amountPaid($bill), 2, '.', '');
    }

    /** Paid via cash and via bank, for the footer totals on the design board. */
    public function paidVia(VendorBill $bill, string $via): string
    {
        $paid = Payment::where('payable_type', 'vendor_bill')
            ->where('payable_id', $bill->id)
            ->where('payment_via', $via)
            ->sum('amount');

        return number_format((float) $paid, 2, '.', '');
    }

    private function replaceLines(VendorBill $bill, array $lines): void
    {
        $bill->lines()->delete();

        $purchaseAccountId = $this->account('expense')->id;

        foreach ($lines as $line) {
            $quantity = (float) ($line['quantity'] ?? 0);
            $unitPrice = (float) ($line['unit_price'] ?? 0);

            $bill->lines()->create([
                'product_id' => $line['product_id'],
                'account_id' => $line['account_id'] ?? $purchaseAccountId,
                'analytic_account_id' => $line['analytic_account_id'] ?? null,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'subtotal' => number_format($quantity * $unitPrice, 2, '.', ''),
            ]);
        }

        $bill->recalculateTotal();
    }

    private function account(string $type): ChartOfAccount
    {
        $account = ChartOfAccount::where('type', $type)->orderBy('code')->first();

        if ($account === null) {
            throw new RuntimeException("No {$type} account is configured - seed the chart of accounts first");
        }

        return $account;
    }

    private function journal(string $type): Journal
    {
        $journal = Journal::where('type', $type)->first();

        if ($journal === null) {
            throw new RuntimeException("No {$type} journal is configured - seed the journals first");
        }

        return $journal;
    }
}
