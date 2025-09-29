<?php

declare(strict_types=1);

namespace App\Services\Comfy;

use Illuminate\Support\Facades\Http;

final class ComfyClient
{
    public function __construct(private readonly string $baseUrl)
    {
    }

    public static function fromEnv(): self
    {
        $url = (string) (config('services.comfyui.url') ?? env('COMFYUI_URL', 'http://comfyui-mock:8188'));
        return new self(rtrim($url, '/'));
    }

    public function prompt(array $payload): array
    {
        $resp = Http::timeout(10)->post($this->baseUrl.'/prompt', $payload);
        if (!$resp->ok()) {
            return ['ok' => false, 'error' => 'http_'.$resp->status(), 'body' => $resp->json()];
        }
        return $resp->json();
    }
}
