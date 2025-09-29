<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Routing\ResponseFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    /**
     * GET /api/health
     * Returns overall health with latencies for app, DB and Redis.
     * HTTP 200 only if all dependencies are healthy, otherwise 503.
     */
    public function index(): JsonResponse
    {
        $appStart = microtime(true);
        $appLatencyMs = null;
        $dbOk = false;
        $dbLatencyMs = null;
        $redisOk = false;
        $redisLatencyMs = null;

        // Measure DB
        try {
            $t0 = microtime(true);
            // Simple query; using select 1 compatible with Postgres
            DB::select('select 1');
            $dbLatencyMs = (int) round((microtime(true) - $t0) * 1000);
            $dbOk = true;
        } catch (\Throwable $e) {
            $dbOk = false;
        }

        // Measure Redis (robust: try facade first, then raw TCP if extension not present)
        try {
            $t0 = microtime(true);
            try {
                $conn = Redis::connection();
                if (method_exists($conn, 'ping')) {
                    $conn->ping();
                } else {
                    // Some drivers expose command
                    @Redis::command('PING');
                }
                $redisLatencyMs = (int) round((microtime(true) - $t0) * 1000);
                $redisOk = true;
            } catch (\Throwable $inner) {
                // Fall back to raw TCP check (no phpredis extension needed)
                $host = (string) env('REDIS_HOST', 'redis');
                $port = (int) env('REDIS_PORT', 6379);
                $errno = 0; $errstr = '';
                $t0 = microtime(true);
                $sock = @fsockopen($host, $port, $errno, $errstr, 1.0);
                if (is_resource($sock)) {
                    $redisLatencyMs = (int) round((microtime(true) - $t0) * 1000);
                    fclose($sock);
                    $redisOk = true;
                } else {
                    $redisOk = false;
                }
            }
        } catch (\Throwable $e) {
            $redisOk = false;
        }

        $appLatencyMs = (int) round((microtime(true) - $appStart) * 1000);
        $overallOk = $dbOk && $redisOk;

        $payload = [
            'ok' => $overallOk,
            'app' => [
                'ok' => true,
                'latency_ms' => $appLatencyMs,
            ],
            'db' => [
                'ok' => $dbOk,
                'latency_ms' => $dbLatencyMs,
            ],
            'redis' => [
                'ok' => $redisOk,
                'latency_ms' => $redisLatencyMs,
            ],
            'ts' => now()->toIso8601String(),
        ];

        return response()->json($payload, $overallOk ? 200 : 503);
    }
}
