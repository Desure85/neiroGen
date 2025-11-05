<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SvgController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt' => ['required', 'string', 'max:2000'],
            'width' => ['nullable', 'integer', 'min:64', 'max:4096'],
            'height' => ['nullable', 'integer', 'min:64', 'max:4096'],
        ]);

        $svggenUrl = rtrim(config('app.svggen_url', env('SVGGEN_URL', 'http://svggen:4000')), '/');
        $endpoint = $svggenUrl.'/generate';

        try {
            $response = Http::timeout((int) config('services.svggen.timeout', 150))
                ->acceptJson()
                ->post($endpoint, [
                    'prompt' => $data['prompt'],
                    'width' => $data['width'] ?? 512,
                    'height' => $data['height'] ?? 512,
                    'mode' => 'blocking',
                ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'error' => 'svggen_unavailable',
                'message' => 'SVG генератор временно недоступен',
            ], 502);
        }

        if (! $response->ok()) {
            return response()->json([
                'error' => 'svggen_error',
                'status' => $response->status(),
                'payload' => $response->json(),
            ], $response->status() >= 400 ? $response->status() : 502);
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            return response()->json([
                'error' => 'svggen_bad_payload',
            ], 502);
        }

        if (($payload['status'] ?? null) !== 'done' || empty($payload['url'])) {
            return response()->json([
                'error' => $payload['error'] ?? 'svggen_failed',
                'status' => $payload['status'] ?? null,
                'job_id' => $payload['job_id'] ?? null,
            ], 502);
        }

        $publicUrl = $payload['url'];

        // Распарсим ключ относительно public storage, если это локальный URL
        $key = null;
        $storagePrefix = asset('storage/');
        if (is_string($publicUrl) && str_starts_with($publicUrl, $storagePrefix)) {
            $key = 'svg/'.ltrim(Str::after($publicUrl, $storagePrefix.'/'), '/');
        }

        return response()->json([
            'key' => $key,
            'url' => $publicUrl,
            'fallback' => (bool) ($payload['fallback'] ?? false),
        ]);
    }
}
