<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\DTOs\AiGenerationRequest;
use App\Services\AI\DTOs\AiGenerationResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleAiProvider implements AiProviderInterface
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getName(): string
    {
        return 'google';
    }

    public function getSupportedContentTypes(): array
    {
        return ['text', 'image', 'exercise'];
    }

    public function generate(AiGenerationRequest $request): AiGenerationResponse
    {
        $model = $request->model ?? $this->config['default_model'] ?? 'gemini-2.0-flash-exp';
        
        $endpoint = rtrim($this->config['endpoint'], '/') . "/models/{$model}:generateContent";

        $params = [
            'contents' => [
                'parts' => [
                    ['text' => $request->prompt],
                ],
            ],
            'generationConfig' => array_merge(
                $this->config['defaults']['text'] ?? [],
                $request->parameters
            ),
        ];

        try {
            $response = Http::timeout($this->config['timeout'] ?? 120)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post("{$endpoint}?key={$this->config['api_key']}", $params);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

                return AiGenerationResponse::success($content, [
                    'model' => $model,
                    'provider' => $this->getName(),
                ]);
            }

            Log::error('Google AI API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return AiGenerationResponse::error(
                'Google AI API error: ' . $response->status()
            );
        } catch (\Exception $e) {
            Log::exception($e);
            return AiGenerationResponse::error($e->getMessage());
        }
    }

    public function isAvailable(): bool
    {
        return !empty($this->config['api_key']);
    }

    public function healthCheck(): array
    {
        if (!$this->isAvailable()) {
            return ['status' => 'unconfigured', 'message' => 'API key not configured'];
        }

        return [
            'status' => 'ok',
            'message' => 'Provider configured',
        ];
    }
}
