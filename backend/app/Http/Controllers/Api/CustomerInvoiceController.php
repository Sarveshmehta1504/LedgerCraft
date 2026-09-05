<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerInvoiceRequest;
use App\Http\Requests\PaymentRequest;
use App\Models\CustomerInvoice;
use App\Services\CustomerInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CustomerInvoiceController extends Controller
{
    use ApiResponse;

    private const LINE_RELATIONS = [
        'lines.product:id,name,type',
        'lines.account:id,code,name,type',
        'lines.analyticAccount:id,name,type',
    ];

    public function __construct(
        private readonly CustomerInvoiceService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CustomerInvoice::class);

        $invoices = CustomerInvoice::query()
            ->with('contact:id,name,type')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('contact_id'), fn ($q, $id) => $q->where('contact_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($sub) => $sub->where('invoice_number', 'like', "%{$term}%")
                    ->orWhere('invoice_reference', 'like', "%{$term}%")
            ))
            ->orderByDesc('id')
            ->get()
            ->map(fn (CustomerInvoice $invoice) => $this->withTotals($invoice));

        return $this->ok('Customer invoices fetched successfully', $invoices);
    }

    public function store(CustomerInvoiceRequest $request): JsonResponse
    {
        $this->authorize('create', CustomerInvoice::class);

        try {
            $invoice = $this->service->create($request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Customer invoice created successfully', $this->withTotals(
            $invoice->load(self::LINE_RELATIONS)
        ), 201);
    }

    public function show(CustomerInvoice $customerInvoice): JsonResponse
    {
        $this->authorize('view', $customerInvoice);

        return $this->ok('Customer invoice fetched successfully', $this->withTotals($customerInvoice->load([
            'contact:id,name,type,email',
            'salesOrder:id,number,status',
            'journalEntry.lines.account:id,code,name,type',
            ...self::LINE_RELATIONS,
        ])));
    }

    public function update(CustomerInvoiceRequest $request, CustomerInvoice $customerInvoice): JsonResponse
    {
        $this->authorize('update', $customerInvoice);

        try {
            $invoice = $this->service->update($customerInvoice, $request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Customer invoice updated successfully', $this->withTotals(
            $invoice->load(self::LINE_RELATIONS)
        ));
    }

    /** Debit Debtors, Credit Sale Income. */
    public function post(Request $request, CustomerInvoice $customerInvoice): JsonResponse
    {
        $this->authorize('update', $customerInvoice);

        try {
            $invoice = $this->service->post($customerInvoice, $request->user()->id);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Customer invoice posted', $this->withTotals($invoice->load([
            'journalEntry.lines.account:id,code,name,type',
            ...self::LINE_RELATIONS,
        ])));
    }

    public function registerPayment(PaymentRequest $request, CustomerInvoice $customerInvoice): JsonResponse
    {
        $this->authorize('update', $customerInvoice);

        try {
            $payment = $this->service->registerPayment(
                $customerInvoice,
                $request->validated(),
                $request->user()->id,
            );
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Payment received', [
            'payment' => $payment,
            'invoice' => $this->withTotals($customerInvoice->fresh()),
        ], 201);
    }

    public function destroy(CustomerInvoice $customerInvoice): JsonResponse
    {
        $this->authorize('delete', $customerInvoice);

        if ($customerInvoice->status !== 'draft') {
            return $this->fail('Only a draft invoice can be deleted - a posted invoice is part of the ledger', 409);
        }

        $customerInvoice->delete();

        return $this->ok('Customer invoice deleted successfully');
    }

    private function withTotals(CustomerInvoice $invoice): array
    {
        return array_merge($invoice->toArray(), [
            'amount_paid' => $this->service->amountPaid($invoice),
            'paid_via_cash' => $this->service->paidVia($invoice, 'cash'),
            'paid_via_bank' => $this->service->paidVia($invoice, 'bank'),
            'amount_due' => $this->service->amountDue($invoice),
        ]);
    }
}
