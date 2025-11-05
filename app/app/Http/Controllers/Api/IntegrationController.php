<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class IntegrationController extends Controller
{
    public function comfyHealth(): JsonResponse
    {
        $url = rtrim((string) config('services.comfyui.url', env('COMFYUI_URL', 'http://localhost:8188')), '/');
        try {
            $resp = Http::timeout((int) config('services.comfyui.timeout', 3))
                ->get($url.'/');
            $ok = $resp->successful();

            return response()->json([
                'ok' => $ok,
                'status' => $resp->status(),
                'url' => $url,
            ], $ok ? 200 : 503);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'status' => 0,
                'url' => $url,
                'error' => $e->getMessage(),
            ], 503);
        }
    }
}
