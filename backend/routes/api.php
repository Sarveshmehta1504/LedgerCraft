<?php

use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/health', function () {
    return response()->json([
        'code' => 200,
        'status' => 'ok',
        'message' => 'API is healthy',
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    // Master data. Per-action authorization lives in the policies, so the
    // routes only require an authenticated user.
    Route::apiResource('contacts', ContactController::class);
    Route::patch('contacts/{contact}/archive', [ContactController::class, 'archive']);
    Route::patch('contacts/{contact}/unarchive', [ContactController::class, 'unarchive']);

    Route::apiResource('product-categories', ProductCategoryController::class)
        ->parameters(['product-categories' => 'productCategory']);
    Route::patch('product-categories/{productCategory}/archive', [ProductCategoryController::class, 'archive']);
    Route::patch('product-categories/{productCategory}/unarchive', [ProductCategoryController::class, 'unarchive']);

    Route::apiResource('products', ProductController::class);
    Route::patch('products/{product}/archive', [ProductController::class, 'archive']);
    Route::patch('products/{product}/unarchive', [ProductController::class, 'unarchive']);
});
