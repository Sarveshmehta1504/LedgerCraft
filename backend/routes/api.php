<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\UserController;
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

// Public auth endpoints. Throttled: these are the brute-force surface.
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('signup', [AuthController::class, 'signup'])->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
});

Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
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

    // Chart of Accounts is exposed as /accounts, matching the frontend routes
    // in docs/FRONTEND_REQUIREMENTS.md.
    Route::apiResource('accounts', ChartOfAccountController::class);
    Route::patch('accounts/{account}/archive', [ChartOfAccountController::class, 'archive']);
    Route::patch('accounts/{account}/unarchive', [ChartOfAccountController::class, 'unarchive']);

    // User management. Admin-only via UserPolicy; this is the only way an
    // admin or accountant account is ever created.
    Route::apiResource('users', UserController::class)->except('update');
    Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update']);
    Route::put('users/{user}/role', [UserController::class, 'assignRole']);
    Route::patch('users/{user}/reactivate', [UserController::class, 'reactivate']);

    Route::apiResource('journals', JournalController::class);
    Route::patch('journals/{journal}/archive', [JournalController::class, 'archive']);
    Route::patch('journals/{journal}/unarchive', [JournalController::class, 'unarchive']);
});
