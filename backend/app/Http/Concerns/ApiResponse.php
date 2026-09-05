<?php

namespace App\Http\Concerns;

use Illuminate\Http\JsonResponse;

/**
 * Every API response uses the same envelope, and `code` always mirrors the HTTP
 * status - see docs/API_DOCUMENTATION.md.
 */
trait ApiResponse
{
    protected function ok(string $message, mixed $data = null, int $code = 200): JsonResponse
    {
        $payload = ['code' => $code, 'message' => $message];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $code);
    }

    protected function fail(string $message, int $code, ?array $errors = null): JsonResponse
    {
        $payload = ['code' => $code, 'message' => $message];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $code);
    }
}
