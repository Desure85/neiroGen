<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ComfyUiService
{
    private string $baseUrl;

    public function __construct(?string $baseUrl = null)
    {
        $this->baseUrl = $baseUrl ?? (string) config('services.comfyui.url', env('COMFYUI_URL', 'http://localhost:8188'));
    }

    /**
     * Dispatch a generation request to ComfyUI.
     * Note: ComfyUI expects a workflow JSON at /prompt.
     * For MVP, we send a minimal payload with prompt text and optional seed.
     *
     * @param  array  $payload  Arbitrary workflow/prompt payload understood by your ComfyUI workflow.
     * @return array{ok:bool,prompt_id?:string,error?:string}
     */
    public function requestGeneration(array $payload): array
    {
        $url = rtrim($this->baseUrl, '/').'/prompt';
        try {
            $resp = Http::timeout((int) config('services.comfyui.timeout', 120))
                ->acceptJson()
                ->asJson()
                ->post($url, $payload);

            if (! $resp->successful()) {
                return ['ok' => false, 'error' => 'HTTP '.$resp->status().': '.$resp->body()];
            }
            $data = $resp->json() ?? [];

            return ['ok' => true, 'prompt_id' => (string) ($data['prompt_id'] ?? ($data['id'] ?? ''))];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
