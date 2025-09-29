<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

final class RequestIdMiddleware
{
    public const HEADER = 'X-Request-Id';

    public function handle(Request $request, Closure $next): Response
    {
        $reqId = $request->headers->get(self::HEADER);
        if (!is_string($reqId) || $reqId === '') {
            $reqId = bin2hex(random_bytes(16));
        }

        // Put into request attributes and logging context
        $request->attributes->set('request_id', $reqId);
        Log::withContext(['request_id' => $reqId]);

        /** @var Response $response */
        $response = $next($request);
        if (!$response->headers->has(self::HEADER)) {
            $response->headers->set(self::HEADER, $reqId);
        }
        return $response;
    }
}
