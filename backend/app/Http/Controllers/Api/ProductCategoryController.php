<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductCategoryRequest;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ProductCategory::class);

        $categories = ProductCategory::query()
            ->with('parent:id,name')
            ->archiveFilter($request->query('archived'))
            ->when($request->query('search'), fn ($q, $term) => $q->where('name', 'like', "%{$term}%"))
            ->orderBy('name')
            ->get();

        return $this->ok('Product categories fetched successfully', $categories);
    }

    public function store(ProductCategoryRequest $request): JsonResponse
    {
        $this->authorize('create', ProductCategory::class);

        $category = ProductCategory::create($request->validated());

        return $this->ok('Product category created successfully', $category, 201);
    }

    public function show(ProductCategory $productCategory): JsonResponse
    {
        $this->authorize('view', $productCategory);

        return $this->ok('Product category fetched successfully', $productCategory->load('parent:id,name'));
    }

    public function update(ProductCategoryRequest $request, ProductCategory $productCategory): JsonResponse
    {
        $this->authorize('update', $productCategory);

        $parentId = $request->validated('parent_id', $productCategory->parent_id);

        if ($productCategory->wouldCycle($parentId ? (int) $parentId : null)) {
            return $this->fail('A category cannot be its own parent or descendant', 422);
        }

        $productCategory->update($request->validated());

        return $this->ok('Product category updated successfully', $productCategory);
    }

    public function archive(ProductCategory $productCategory): JsonResponse
    {
        $this->authorize('archive', $productCategory);

        // Assigned directly, not via update(): archived_at is deliberately
        // not fillable so it can never be set from a request payload.
        $productCategory->archived_at = now();
        $productCategory->save();

        return $this->ok('Product category archived successfully', $productCategory);
    }

    public function unarchive(ProductCategory $productCategory): JsonResponse
    {
        $this->authorize('archive', $productCategory);

        $productCategory->archived_at = null;
        $productCategory->save();

        return $this->ok('Product category unarchived successfully', $productCategory);
    }

    /**
     * Blocked while the category is in use or has children - the FK is
     * restrict, so this returns 409 instead of letting MySQL throw a 500.
     */
    public function destroy(ProductCategory $productCategory): JsonResponse
    {
        $this->authorize('delete', $productCategory);

        if ($productCategory->products()->exists()) {
            return $this->fail('Category is used by one or more products and cannot be deleted', 409);
        }

        if ($productCategory->children()->exists()) {
            return $this->fail('Category has child categories and cannot be deleted', 409);
        }

        $productCategory->delete();

        return $this->ok('Product category deleted successfully');
    }
}
