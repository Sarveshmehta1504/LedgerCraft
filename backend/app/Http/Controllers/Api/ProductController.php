<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Services\ProductCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ProductCache $cache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $products = Product::query()
            ->with('category:id,name,parent_id')
            ->archiveFilter($request->query('archived'))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when($request->query('search'), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->orderBy('name')
            ->get();

        return $this->ok('Products fetched successfully', $products);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $product = Product::create($request->validated())->load('category:id,name,parent_id');

        return $this->ok('Product created successfully', $product, 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);

        return $this->ok('Product fetched successfully', $this->cache->find($product->id));
    }

    public function cacheStats(): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        return $this->ok('Product cache statistics', $this->cache->stats());
    }

    public function update(ProductRequest $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $product->update($request->validated());
        $this->cache->forget($product->id);

        return $this->ok('Product updated successfully', $product->load('category:id,name,parent_id'));
    }

    public function archive(Product $product): JsonResponse
    {
        $this->authorize('archive', $product);

        $product->archived_at = now();
        $product->save();
        $this->cache->forget($product->id);

        return $this->ok('Product archived successfully', $product);
    }

    public function unarchive(Product $product): JsonResponse
    {
        $this->authorize('archive', $product);

        $product->archived_at = null;
        $product->save();
        $this->cache->forget($product->id);

        return $this->ok('Product unarchived successfully', $product);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $productId = $product->id;
        $product->delete();
        $this->cache->forget($productId);

        return $this->ok('Product deleted successfully');
    }
}
