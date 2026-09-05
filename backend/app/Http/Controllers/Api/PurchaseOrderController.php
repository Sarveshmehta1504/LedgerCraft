<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrderRequest;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class PurchaseOrderController extends Controller
{
    use ApiResponse;

    private const LINE_RELATIONS = [
        'lines.product:id,name,type',
        'lines.account:id,code,name,type',
        'lines.analyticAccount:id,name,type',
    ];

    public function __construct(
        private readonly PurchaseOrderService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PurchaseOrder::class);

        $orders = PurchaseOrder::query()
            ->with('contact:id,name,type')
            ->withCount('lines')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('contact_id'), fn ($q, $id) => $q->where('contact_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where('number', 'like', "%{$term}%"))
            ->orderByDesc('id')
            ->get();

        return $this->ok('Purchase orders fetched successfully', $orders);
    }

    public function store(PurchaseOrderRequest $request): JsonResponse
    {
        $this->authorize('create', PurchaseOrder::class);

        try {
            $order = $this->service->create($request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Purchase order created successfully', $order->load(self::LINE_RELATIONS), 201);
    }

    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('view', $purchaseOrder);

        return $this->ok('Purchase order fetched successfully', $purchaseOrder->load(
            ['contact:id,name,type,email', 'bill:id,purchase_order_id,bill_number,status', ...self::LINE_RELATIONS]
        ));
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('update', $purchaseOrder);

        try {
            $order = $this->service->update($purchaseOrder, $request->validated());
        } catch (RuntimeException $e) {
            // A non-draft order is a state conflict, not bad input.
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Purchase order updated successfully', $order->load(self::LINE_RELATIONS));
    }

    public function confirm(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('update', $purchaseOrder);

        try {
            $order = $this->service->confirm($purchaseOrder);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Purchase order confirmed', $order->load(self::LINE_RELATIONS));
    }

    public function convertToBill(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('update', $purchaseOrder);

        try {
            $bill = $this->service->convertToBill($purchaseOrder);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Vendor bill created from purchase order', $bill, 201);
    }

    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('delete', $purchaseOrder);

        if (! $purchaseOrder->isDraft()) {
            return $this->fail('Only a draft purchase order can be deleted', 409);
        }

        // Lines cascade with the order.
        $purchaseOrder->delete();

        return $this->ok('Purchase order deleted successfully');
    }
}
