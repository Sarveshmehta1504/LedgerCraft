<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every JSON error response uses the {code, message, errors} envelope
        // from docs/AGENTS.md § 6, `code` always mirroring the HTTP status -
        // otherwise a client checking `response.code` sees nothing on error.
        $envelope = function (int $code, string $message, ?array $errors = null): JsonResponse {
            $payload = ['code' => $code, 'message' => $message];

            if ($errors !== null) {
                $payload['errors'] = $errors;
            }

            return response()->json($payload, $code);
        };

        // This backend is API-only under /api - always answer JSON there
        // regardless of the client's Accept header. Relying on
        // $request->expectsJson() alone is wrong here: a bare Postman/curl
        // request with no Accept: application/json header makes it return
        // false, so a validation failure falls through to Laravel's default
        // *web* behavior - a 302 redirect back to the referrer (or APP_URL
        // root with no referrer) - which looks like the API "did nothing".
        $isApi = fn (Request $request) => $request->is('api/*') || $request->expectsJson();

        $exceptions->render(function (ValidationException $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(422, 'Validation failed', $e->errors());
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(401, 'Unauthenticated');
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(403, $e->getMessage() ?: 'This action is unauthorized');
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(404, 'Resource not found');
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(404, 'Resource not found');
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope($e->getStatusCode(), $e->getMessage() ?: 'Request failed');
            }
        });

        $exceptions->render(function (Throwable $e, Request $request) use ($envelope, $isApi) {
            if ($isApi($request)) {
                return $envelope(500, app()->hasDebugModeEnabled() ? $e->getMessage() : 'Server error');
            }
        });
    })->create();
