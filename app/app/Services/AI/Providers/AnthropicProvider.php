<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\DTOs\AiGenerationRequest;
use App\Services\AI\DTOs\AiGenerationResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicProvider implements AiProviderInterface
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getName(): string
    {
        return 'anthropic';
    }

    public function getSupportedContentTypes(): array
    {
        return ['text', 'exercise'];
    }

    public function generate(AiGenerationRequest $request): AiGenerationResponse
    {
        $model = $request->model ?? $this->config['default_model'] ?? 'claude-3-5-sonnet-20241022';
        
        $endpoint = rtrim($this->config['endpoint'], '/') . '/messages';

        $params = array_merge(
            $this->config['defaults']['text'] ?? [],
            $request->parameters,
            [
                'model' => $model,
                'max_tokens' => $request->parameters['max_tokens'] ?? 4096,
                'messages' => [
                    ['role' => 'user', 'content' => $request->prompt],
                ],
            ]
        );

        try {
            $response = Http::timeout($this->config['timeout'] ?? 120)
                ->withHeaders([
                    'x-api-key' => $this->config['api_key'],
                    'anthropic-version' => '2023-06-01',
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, $params);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['content'][0]['text'] ?? '';

                return AiGenerationResponse::success($content, [
                    'model' => $model,
                    'provider' => $this->getName(),
                    'usage' => $data['usage'] ?? [],
                ]);
            }

            Log::error('Anthropic API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return AiGenerationResponse::error(
                'Anthropic API error: ' . ($response->json()['error']['message'] ?? $response->status())
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
