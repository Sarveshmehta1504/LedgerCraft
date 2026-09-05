<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Http\Requests\VendorBillRequest;
use App\Models\VendorBill;
use App\Services\VendorBillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class VendorBillController extends Controller
{
    use ApiResponse;

    private const LINE_RELATIONS = [
        'lines.product:id,name,type',
        'lines.account:id,code,name,type',
        'lines.analyticAccount:id,name,type',
    ];

    public function __construct(
        private readonly VendorBillService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', VendorBill::class);

        $bills = VendorBill::query()
            ->with('contact:id,name,type')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('contact_id'), fn ($q, $id) => $q->where('contact_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($sub) => $sub->where('bill_number', 'like', "%{$term}%")
                    ->orWhere('bill_reference', 'like', "%{$term}%")
            ))
            ->orderByDesc('id')
            ->get()
            ->map(fn (VendorBill $bill) => $this->withTotals($bill));

        return $this->ok('Vendor bills fetched successfully', $bills);
    }

    public function store(VendorBillRequest $request): JsonResponse
    {
        $this->authorize('create', VendorBill::class);

        try {
            $bill = $this->service->create($request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Vendor bill created successfully', $this->withTotals(
            $bill->load(self::LINE_RELATIONS)
        ), 201);
    }

    public function show(VendorBill $vendorBill): JsonResponse
    {
        $this->authorize('view', $vendorBill);

        return $this->ok('Vendor bill fetched successfully', $this->withTotals($vendorBill->load([
            'contact:id,name,type,email',
            'purchaseOrder:id,number,status',
            'journalEntry.lines.account:id,code,name,type',
            ...self::LINE_RELATIONS,
        ])));
    }

    public function update(VendorBillRequest $request, VendorBill $vendorBill): JsonResponse
    {
        $this->authorize('update', $vendorBill);

        try {
            $bill = $this->service->update($vendorBill, $request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Vendor bill updated successfully', $this->withTotals(
            $bill->load(self::LINE_RELATIONS)
        ));
    }

    /**
     * Posting is what puts the bill into the ledger - Debit Purchase Expense,
     * Credit Creditors - so the response carries the generated entry.
     */
    public function post(Request $request, VendorBill $vendorBill): JsonResponse
    {
        $this->authorize('update', $vendorBill);

        try {
            $bill = $this->service->post($vendorBill, $request->user()->id);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Vendor bill posted', $this->withTotals($bill->load([
            'journalEntry.lines.account:id,code,name,type',
            ...self::LINE_RELATIONS,
        ])));
    }

    public function registerPayment(PaymentRequest $request, VendorBill $vendorBill): JsonResponse
    {
        $this->authorize('update', $vendorBill);

        try {
            $payment = $this->service->registerPayment(
                $vendorBill,
                $request->validated(),
                $request->user()->id,
            );
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Payment registered', [
            'payment' => $payment,
            'bill' => $this->withTotals($vendorBill->fresh()),
        ], 201);
    }

    public function destroy(VendorBill $vendorBill): JsonResponse
    {
        $this->authorize('delete', $vendorBill);

        if ($vendorBill->status !== 'draft') {
            return $this->fail('Only a draft bill can be deleted - a posted bill is part of the ledger', 409);
        }

        $vendorBill->delete();

        return $this->ok('Vendor bill deleted successfully');
    }

    /**
     * Footer totals from the design board: Total, Paid via Cash, Paid via Bank,
     * Amount Due. All derived from payments, never stored.
     */
    private function withTotals(VendorBill $bill): array
    {
        return array_merge($bill->toArray(), [
            'amount_paid' => $this->service->amountPaid($bill),
            'paid_via_cash' => $this->service->paidVia($bill, 'cash'),
            'paid_via_bank' => $this->service->paidVia($bill, 'bank'),
            'amount_due' => $this->service->amountDue($bill),
        ]);
    }
}
