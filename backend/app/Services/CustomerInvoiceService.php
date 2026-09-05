<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\CustomerInvoice;
use App\Models\Journal;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Customer invoice lifecycle: draft -> posted -> paid.
 *
 * The mirror image of VendorBillService:
 *   post    -> Debit Debtors/AR,  Credit Sale Income
 *   payment -> Debit Cash|Bank,   Credit Debtors/AR
 *
 * Both go through JournalEntryService, so the balance invariant lives in one
 * place for the whole application.
 */
class CustomerInvoiceService
{
    public function __construct(
        private readonly JournalEntryService $journalEntries,
        private readonly DocumentNumberService $numbers,
    ) {}

    public function create(array $data): CustomerInvoice
    {
        return DB::transaction(function () use ($data) {
            $invoice = CustomerInvoice::create([
                'invoice_number' => $this->numbers->customerInvoice(),
                'sales_order_id' => $data['sales_order_id'] ?? null,
                'contact_id' => $data['contact_id'],
                'invoice_date' => $data['invoice_date'],
                'due_date' => $data['due_date'] ?? null,
                'invoice_reference' => $data['invoice_reference'] ?? null,
                'status' => 'draft',
                'total' => 0,
            ]);

            $this->replaceLines($invoice, $data['lines']);

            return $invoice->load('lines', 'contact');
        });
    }

    public function update(CustomerInvoice $invoice, array $data): CustomerInvoice
    {
        if ($invoice->status !== 'draft') {
            throw new RuntimeException('Only a draft invoice can be edited');
        }

        return DB::transaction(function () use ($invoice, $data) {
            $invoice->fill(array_intersect_key($data, array_flip([
                'contact_id', 'invoice_date', 'due_date', 'invoice_reference',
            ])))->save();

            if (isset($data['lines'])) {
                $this->replaceLines($invoice, $data['lines']);
            }

            return $invoice->fresh(['lines', 'contact']);
        });
    }

    /**
     * Debit Debtors/AR, Credit Sale Income, for the tax-inclusive total. Tax is
     * a percentage add-on posted to Sale Income - there is no separate tax
     * liability account in P0 scope.
     */
    public function post(CustomerInvoice $invoice, int $userId): CustomerInvoice
    {
        if ($invoice->status !== 'draft') {
            throw new RuntimeException("A {$invoice->status} invoice cannot be posted again");
        }

        if ($invoice->lines()->count() === 0) {
            throw new RuntimeException('An invoice needs at least one line before it can be posted');
        }

        return DB::transaction(function () use ($invoice, $userId) {
            $entry = $this->journalEntries->postDoubleEntry(
                journalId: $this->journal('sales')->id,
                date: $invoice->invoice_date,
                sourceType: 'customer_invoice',
                sourceId: $invoice->id,
                debitAccountId: $this->account('asset')->id,
                creditAccountId: $this->account('income')->id,
                amount: $invoice->total,
                reference: $invoice->invoice_number,
                createdBy: $userId,
            );

            $invoice->status = 'posted';
            $invoice->journal_entry_id = $entry->id;
            $invoice->save();

            return $invoice->fresh(['lines', 'contact', 'journalEntry.lines']);
        });
    }

    /**
     * Receiving money: Debit Cash|Bank, Credit Debtors/AR. The invoice flips to
     * `paid` once nothing is left owing.
     */
    public function registerPayment(CustomerInvoice $invoice, array $data, int $userId): Payment
    {
        if ($invoice->status === 'draft') {
            throw new RuntimeException('Post the invoice before registering a payment');
        }

        if ($invoice->status === 'paid') {
            throw new RuntimeException('This invoice is already fully paid');
        }

        $amount = (float) $data['amount'];
        $due = (float) $this->amountDue($invoice);

        if ($amount <= 0) {
            throw new RuntimeException('Payment amount must be greater than zero');
        }

        if (round($amount, 2) > round($due, 2)) {
            throw new RuntimeException(
                'Payment of '.number_format($amount, 2).' exceeds the amount due of '.number_format($due, 2)
            );
        }

        $via = $data['payment_via'] ?? 'bank';

        return DB::transaction(function () use ($invoice, $data, $amount, $via, $userId) {
            $journal = $this->journal($via);
            $cashOrBank = $this->account($via === 'cash' ? 'cash' : 'bank');
            $date = $data['date'] ?? now()->toDateString();

            // Payment first, so the entry can carry a real source_id.
            $payment = Payment::create([
                'contact_id' => $invoice->contact_id,
                // Money coming in, unlike a vendor bill payment.
                'payment_type' => 'receive',
                'payable_type' => 'customer_invoice',
                'payable_id' => $invoice->id,
                'payment_via' => $via,
                'journal_id' => $journal->id,
                'amount' => $amount,
                'date' => $date,
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $entry = $this->journalEntries->postDoubleEntry(
                journalId: $journal->id,
                date: $date,
                sourceType: 'payment',
                sourceId: $payment->id,
                debitAccountId: $cashOrBank->id,
                creditAccountId: $this->account('asset')->id,
                amount: $amount,
                reference: $invoice->invoice_number,
                createdBy: $userId,
            );

            $payment->journal_entry_id = $entry->id;
            $payment->save();

            if (round((float) $this->amountDue($invoice->fresh()), 2) <= 0.0) {
                $invoice->status = 'paid';
                $invoice->save();
            }

            return $payment->load('journalEntry.lines');
        });
    }

    public function amountPaid(CustomerInvoice $invoice): string
    {
        $paid = Payment::where('payable_type', 'customer_invoice')
            ->where('payable_id', $invoice->id)
            ->sum('amount');

        return number_format((float) $paid, 2, '.', '');
    }

    public function amountDue(CustomerInvoice $invoice): string
    {
        return number_format((float) $invoice->total - (float) $this->amountPaid($invoice), 2, '.', '');
    }

    public function paidVia(CustomerInvoice $invoice, string $via): string
    {
        $paid = Payment::where('payable_type', 'customer_invoice')
            ->where('payable_id', $invoice->id)
            ->where('payment_via', $via)
            ->sum('amount');

        return number_format((float) $paid, 2, '.', '');
    }

    private function replaceLines(CustomerInvoice $invoice, array $lines): void
    {
        $invoice->lines()->delete();

        $salesAccountId = $this->account('income')->id;

        foreach ($lines as $line) {
            $quantity = (float) ($line['quantity'] ?? 0);
            $unitPrice = (float) ($line['unit_price'] ?? 0);

            $invoice->lines()->create([
                'product_id' => $line['product_id'],
                'account_id' => $line['account_id'] ?? $salesAccountId,
                'analytic_account_id' => $line['analytic_account_id'] ?? null,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'tax_percent' => (float) ($line['tax_percent'] ?? 0),
                'subtotal' => number_format($quantity * $unitPrice, 2, '.', ''),
            ]);
        }

        $invoice->recalculateTotal();
    }

    /**
     * Accounts are resolved by type, lowest code first. The seeded chart has
     * exactly one account per type, so `asset` is Debtors and `income` is Sale
     * Income. If a second account of a type is ever added, this needs an
     * explicit mapping rather than a lookup.
     */
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
