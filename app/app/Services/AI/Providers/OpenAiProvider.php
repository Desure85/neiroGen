<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\DTOs\AiGenerationRequest;
use App\Services\AI\DTOs\AiGenerationResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiProvider implements AiProviderInterface
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function getName(): string
    {
        return 'openai';
    }

    public function getSupportedContentTypes(): array
    {
        return ['text', 'image', 'audio', 'exercise'];
    }

    public function generate(AiGenerationRequest $request): AiGenerationResponse
    {
        $model = $request->model ?? $this->config['default_model'] ?? 'gpt-4o';
        
        // Determine if this is an image generation request
        if ($request->contentType === 'image') {
            return $this->generateImage($request, $model);
        }

        // Text-based generation
        return $this->generateText($request, $model);
    }

    protected function generateText(AiGenerationRequest $request, string $model): AiGenerationResponse
    {
        $endpoint = rtrim($this->config['endpoint'], '/') . '/chat/completions';
        
        $params = array_merge(
            $this->config['defaults']['text'] ?? [],
            $request->parameters,
            [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $request->prompt],
                ],
            ]
        );

        try {
            $response = Http::timeout($this->config['timeout'] ?? 120)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->config['api_key'],
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, $params);

            if ($response->successful()) {
                $data = $response->json();
                $content = $data['choices'][0]['message']['content'] ?? '';

                return AiGenerationResponse::success($content, [
                    'model' => $model,
                    'provider' => $this->getName(),
                    'usage' => $data['usage'] ?? [],
                ]);
            }

            Log::error('OpenAI API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return AiGenerationResponse::error(
                'OpenAI API error: ' . ($response->json()['error']['message'] ?? $response->status())
            );
        } catch (\Exception $e) {
            Log::exception($e);
            return AiGenerationResponse::error($e->getMessage());
        }
    }

    protected function generateImage(AiGenerationRequest $request, string $model): AiGenerationResponse
    {
        $endpoint = rtrim($this->config['endpoint'], '/') . '/images/generations';
        
        $model = $this->config['image_model'] ?? 'dall-e-3';

        $params = array_merge(
            $this->config['defaults']['image'] ?? [],
            $request->parameters,
            [
                'model' => $model,
                'prompt' => $request->prompt,
            ]
        );

        try {
            $response = Http::timeout($this->config['timeout'] ?? 120)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->config['api_key'],
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, $params);

            if ($response->successful()) {
                $data = $response->json();
                $imageUrl = $data['data'][0]['url'] ?? null;

                if ($imageUrl) {
                    return AiGenerationResponse::success($imageUrl, [
                        'model' => $model,
                        'provider' => $this->getName(),
                        'revised_prompt' => $data['data'][0]['revised_prompt'] ?? null,
                    ]);
                }

                return AiGenerationResponse::error('No image URL in response');
            }

            Log::error('OpenAI Image API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return AiGenerationResponse::error(
                'OpenAI Image API error: ' . ($response->json()['error']['message'] ?? $response->status())
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

        try {
            $endpoint = rtrim($this->config['endpoint'], '/') . '/models';
            
            $response = Http::timeout(5)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->config['api_key'],
                ])
                ->get($endpoint);

            return [
                'status' => $response->successful() ? 'ok' : 'error',
                'response_code' => $response->status(),
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }
}
