<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Models\CustomerInvoice;
use App\Models\VendorBill;
use App\Services\CustomerInvoiceService;
use App\Services\DocumentMailService;
use App\Services\DocumentPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

/**
 * The contact portal: a role-`user` account seeing only its own documents.
 *
 * Scoping is derived from the authenticated user's `contact_id` on every query
 * and is never taken from the request. A portal user cannot widen the scope by
 * sending a different id, because no id is accepted.
 *
 * Drafts are deliberately invisible here: an unposted document has not been
 * issued to the customer and must not appear in their portal.
 */
class PortalController extends Controller
{
    use ApiResponse;

    private const VISIBLE_STATUSES = ['posted', 'paid'];

    public function __construct(
        private readonly CustomerInvoiceService $invoices,
    ) {}

    public function invoices(Request $request): JsonResponse
    {
        $contactId = $this->contactId($request);

        $invoices = CustomerInvoice::query()
            ->where('contact_id', $contactId)
            ->whereIn('status', self::VISIBLE_STATUSES)
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('invoice_date')
            ->get()
            ->map(fn (CustomerInvoice $invoice) => $this->invoiceSummary($invoice));

        return $this->ok('Invoices fetched successfully', $invoices);
    }

    public function bills(Request $request): JsonResponse
    {
        $contactId = $this->contactId($request);

        $bills = VendorBill::query()
            ->where('contact_id', $contactId)
            ->whereIn('status', self::VISIBLE_STATUSES)
            ->orderByDesc('bill_date')
            ->get(['id', 'bill_number', 'bill_date', 'due_date', 'status', 'total']);

        return $this->ok('Bills fetched successfully', $bills);
    }

    public function showInvoice(Request $request, CustomerInvoice $invoice): JsonResponse
    {
        $this->assertOwned($request, $invoice);

        return $this->ok('Invoice fetched successfully', $this->invoiceSummary($invoice->load([
            'lines.product:id,name,type',
            'contact:id,name,email',
        ])));
    }

    /**
     * "Pay my dues from the portal", per the design board. Goes through the
     * same service as an accountant-registered payment, so the ledger entry is
     * identical and the balance invariant still applies.
     */
    public function payInvoice(PaymentRequest $request, CustomerInvoice $invoice): JsonResponse
    {
        $this->assertOwned($request, $invoice);

        try {
            $payment = $this->invoices->registerPayment(
                $invoice,
                $request->validated(),
                $request->user()->id,
            );
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Payment received', [
            'payment' => $payment->only(['id', 'amount', 'date', 'payment_via', 'payment_type']),
            'invoice' => $this->invoiceSummary($invoice->fresh()),
        ], 201);
    }

    /**
     * The same server-rendered PDF the back office downloads, scoped to the
     * caller's own contact. Shares DocumentPdfService with
     * CustomerInvoiceController so both sides produce an identical document.
     */
    public function invoicePdf(Request $request, CustomerInvoice $invoice)
    {
        $this->assertOwned($request, $invoice);

        return app(DocumentPdfService::class)->invoice($invoice)
            ->download(str_replace('/', '-', $invoice->invoice_number).'.pdf');
    }

    /**
     * Mails the customer their own invoice.
     *
     * No recipient is accepted: it always goes to the contact this account is
     * linked to. Letting a portal user name an address would turn the portal
     * into a way to mail someone else's business documents anywhere.
     */
    public function sendInvoice(Request $request, CustomerInvoice $invoice): JsonResponse
    {
        $this->assertOwned($request, $invoice);

        try {
            $recipient = app(DocumentMailService::class)->sendInvoice($invoice);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        } catch (Throwable $e) {
            return $this->fail('Could not send the invoice: '.$e->getMessage(), 500);
        }

        return $this->ok("Invoice sent to {$recipient}");
    }

    /**
     * A 404, not a 403: telling a portal user that an invoice exists but is
     * someone else's still leaks that it exists.
     */
    private function assertOwned(Request $request, CustomerInvoice $invoice): void
    {
        $contactId = $this->contactId($request);

        if ($invoice->contact_id !== $contactId || ! in_array($invoice->status, self::VISIBLE_STATUSES, true)) {
            abort(404, 'Invoice not found');
        }
    }

    private function contactId(Request $request): int
    {
        $contactId = $request->user()->contact_id;

        if ($contactId === null) {
            // Admin and accountant accounts have no linked contact, so there is
            // no "own" scope for them to read.
            abort(403, 'This account is not linked to a contact');
        }

        return $contactId;
    }

    private function invoiceSummary(CustomerInvoice $invoice): array
    {
        return array_merge($invoice->toArray(), [
            'amount_paid' => $this->invoices->amountPaid($invoice),
            'amount_due' => $this->invoices->amountDue($invoice),
        ]);
    }
}
