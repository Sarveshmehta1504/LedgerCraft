<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\SalesOrderRequest;
use App\Models\SalesOrder;
use App\Services\SalesOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SalesOrderController extends Controller
{
    use ApiResponse;

    private const LINE_RELATIONS = [
        'lines.product:id,name,type',
        'lines.account:id,code,name,type',
        'lines.analyticAccount:id,name,type',
    ];

    public function __construct(
        private readonly SalesOrderService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SalesOrder::class);

        $orders = SalesOrder::query()
            ->with('contact:id,name,type')
            ->withCount('lines')
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('contact_id'), fn ($q, $id) => $q->where('contact_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where('number', 'like', "%{$term}%"))
            ->orderByDesc('id')
            ->get();

        return $this->ok('Sales orders fetched successfully', $orders);
    }

    public function store(SalesOrderRequest $request): JsonResponse
    {
        $this->authorize('create', SalesOrder::class);

        try {
            $order = $this->service->create($request->validated());
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        return $this->ok('Sales order created successfully', $order->load(self::LINE_RELATIONS), 201);
    }

    public function show(SalesOrder $salesOrder): JsonResponse
    {
        $this->authorize('view', $salesOrder);

        return $this->ok('Sales order fetched successfully', $salesOrder->load(
            ['contact:id,name,type,email', 'invoice:id,sales_order_id,invoice_number,status', ...self::LINE_RELATIONS]
        ));
    }

    public function update(SalesOrderRequest $request, SalesOrder $salesOrder): JsonResponse
    {
        $this->authorize('update', $salesOrder);

        try {
            $order = $this->service->update($salesOrder, $request->validated());
        } catch (RuntimeException $e) {
            // A non-draft order is a state conflict, not bad input.
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Sales order updated successfully', $order->load(self::LINE_RELATIONS));
    }

    public function confirm(SalesOrder $salesOrder): JsonResponse
    {
        $this->authorize('update', $salesOrder);

        try {
            $order = $this->service->confirm($salesOrder);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Sales order confirmed', $order->load(self::LINE_RELATIONS));
    }

    public function convertToInvoice(SalesOrder $salesOrder): JsonResponse
    {
        $this->authorize('update', $salesOrder);

        try {
            $invoice = $this->service->convertToInvoice($salesOrder);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 409);
        }

        return $this->ok('Customer invoice created from sales order', $invoice, 201);
    }

    public function destroy(SalesOrder $salesOrder): JsonResponse
    {
        $this->authorize('delete', $salesOrder);

        if (! $salesOrder->isDraft()) {
            return $this->fail('Only a draft sales order can be deleted', 409);
        }

        // Lines cascade with the order.
        $salesOrder->delete();

        return $this->ok('Sales order deleted successfully');
    }
}
