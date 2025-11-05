<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

final class RequestLoggingMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('__req_start', microtime(true));
        /** @var Response $response */
        $response = $next($request);

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        $started = (float) ($request->attributes->get('__req_start') ?? microtime(true));
        $latencyMs = (int) round((microtime(true) - $started) * 1000);

        $user = $request->user();
        $reqId = $request->attributes->get('request_id') ?? $request->headers->get(RequestIdMiddleware::HEADER);

        Log::info('http_access', [
            'request_id' => $reqId,
            'method' => $request->getMethod(),
            'path' => $request->getPathInfo(),
            'query' => $request->getQueryString(),
            'status' => $response->getStatusCode(),
            'ip' => $request->ip(),
            'user_id' => $user?->id,
            'duration_ms' => $latencyMs,
            'ua' => substr((string) $request->header('User-Agent'), 0, 200),
        ]);
    }
}
