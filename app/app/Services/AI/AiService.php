<?php

namespace App\Services\AI;

use App\Models\AiProviderSettings;
use App\Services\AI\Contracts\AiProviderInterface;
use App\Services\AI\DTOs\AiGenerationRequest;
use App\Services\AI\DTOs\AiGenerationResponse;
use Illuminate\Support\Facades\Log;

class AiService
{
    /**
     * @var array<string, AiProviderInterface>
     */
    protected array $providers = [];

    /**
     * @var array<string, string> content_type => provider_key
     */
    protected array $providerMapping = [];

    public function __construct()
    {
        $this->initializeProviders();
    }

    /**
     * Initialize all configured providers
     */
    protected function initializeProviders(): void
    {
        // Get provider configuration from config/ai.php
        $config = config('ai', []);

        // Get database settings (if any)
        $dbConfigs = [];
        try {
            $dbConfigs = AiProviderSettings::getAllConfigs();
        } catch (\Exception $e) {
            // Database might not be ready yet
            Log::warning('Could not load AI provider settings from database: ' . $e->getMessage());
        }

        // Initialize providers
        foreach ($config['providers'] ?? [] as $key => $providerConfig) {
            // Merge DB config with env config (DB takes priority)
            $mergedConfig = $providerConfig;
            
            if (isset($dbConfigs[$key])) {
                $dbConfig = $dbConfigs[$key];
                if ($dbConfig['enabled']) {
                    $mergedConfig['enabled'] = true;
                }
                if (!empty($dbConfig['api_key'])) {
                    $mergedConfig['api_key'] = $dbConfig['api_key'];
                }
                if (!empty($dbConfig['model'])) {
                    $mergedConfig['default_model'] = $dbConfig['model'];
                }
            }

            if ($mergedConfig['enabled'] ?? false) {
                $this->registerProvider($key, $mergedConfig);
            }
        }

        // Set up content type to provider mapping
        $this->providerMapping = $config['content_types'] ?? [
            'text' => 'openai',
            'image' => 'openai',
            'audio' => 'openai',
            'exercise' => 'openai',
        ];
    }

    /**
     * Register a provider
     */
    public function registerProvider(string $key, array $config): void
    {
        $providerClass = match ($key) {
            'openai' => \App\Services\AI\Providers\OpenAiProvider::class,
            'anthropic' => \App\Services\AI\Providers\AnthropicProvider::class,
            'google' => \App\Services\AI\Providers\GoogleAiProvider::class,
            default => null,
        };

        if ($providerClass && class_exists($providerClass)) {
            $this->providers[$key] = new $providerClass($config);
            Log::info("AI Provider registered: {$key}");
        }
    }

    /**
     * Get provider for a specific content type
     */
    public function getProviderForContentType(string $contentType): ?AiProviderInterface
    {
        $providerKey = $this->providerMapping[$contentType] ?? null;

        if (!$providerKey || !isset($this->providers[$providerKey])) {
            Log::warning("No provider configured for content type: {$contentType}");
            return null;
        }

        return $this->providers[$providerKey];
    }

    /**
     * Generate content using the appropriate provider for the content type
     */
    public function generate(AiGenerationRequest $request): AiGenerationResponse
    {
        $provider = $this->getProviderForContentType($request->contentType);

        if (!$provider) {
            return AiGenerationResponse::error(
                "No provider available for content type: {$request->contentType}"
            );
        }

        if (!$provider->isAvailable()) {
            return AiGenerationResponse::error(
                "Provider '{$provider->getName()}' is not available"
            );
        }

        try {
            return $provider->generate($request);
        } catch (\Throwable $e) {
            Log::error("AI generation failed", [
                'provider' => $provider->getName(),
                'content_type' => $request->contentType,
                'error' => $e->getMessage(),
            ]);

            return AiGenerationResponse::error($e->getMessage());
        }
    }

    /**
     * Generate text content
     */
    public function generateText(string $prompt, array $parameters = []): AiGenerationResponse
    {
        return $this->generate(AiGenerationRequest::forText($prompt, $parameters));
    }

    /**
     * Generate image content
     */
    public function generateImage(string $prompt, array $parameters = []): AiGenerationResponse
    {
        return $this->generate(AiGenerationRequest::forImage($prompt, $parameters));
    }

    /**
     * Generate exercise content
     */
    public function generateExercise(string $prompt, array $parameters = []): AiGenerationResponse
    {
        return $this->generate(AiGenerationRequest::forExercise($prompt, $parameters));
    }

    /**
     * Get all registered providers
     */
    public function getProviders(): array
    {
        return $this->providers;
    }

    /**
     * Get health status for all providers
     */
    public function healthCheck(): array
    {
        $status = [];

        foreach ($this->providers as $key => $provider) {
            $status[$key] = [
                'name' => $provider->getName(),
                'available' => $provider->isAvailable(),
                'content_types' => $provider->getSupportedContentTypes(),
                'health' => $provider->healthCheck(),
            ];
        }

        return $status;
    }

    /**
     * Get all available providers (including unconfigured ones)
     */
    public function getAllProviders(): array
    {
        $config = config('ai.providers', []);
        $result = [];

        foreach ($config as $key => $providerConfig) {
            // Get DB settings if any
            $dbConfig = null;
            try {
                $dbConfig = AiProviderSettings::getConfig($key);
            } catch (\Exception $e) {
                // Ignore
            }

            $isEnabled = $providerConfig['enabled'] ?? false;
            $isDbEnabled = $dbConfig && $dbConfig['enabled'];

            $result[$key] = [
                'name' => $key,
                'available' => $isEnabled || $isDbEnabled,
                'enabled' => $isDbEnabled,
                'model' => $dbConfig['model'] ?? $providerConfig['default_model'] ?? null,
                'has_api_key' => !empty($providerConfig['api_key']) || !empty($dbConfig['api_key']),
                'content_types' => match ($key) {
                    'openai' => ['text', 'image', 'audio', 'exercise'],
                    'anthropic' => ['text', 'exercise'],
                    'google' => ['text', 'image'],
                    default => [],
                },
                'health' => [
                    'status' => ($isEnabled || $isDbEnabled) ? 'ok' : 'unconfigured',
                    'message' => ($isEnabled || $isDbEnabled) 
                        ? 'Provider is configured and ready' 
                        : 'Provider not configured. Add API key to enable.',
                ],
            ];
        }

        return $result;
    }

    /**
     * Update provider settings
     */
    public function updateProviderSettings(
        string $provider,
        ?string $apiKey = null,
        ?string $model = null,
        bool $enabled = false,
        ?array $settings = null
    ): array {
        $config = config('ai.providers.' . $provider);

        if (!$config) {
            return ['ok' => false, 'error' => 'Unknown provider: ' . $provider];
        }

        // Update in database
        AiProviderSettings::setConfig($provider, $apiKey, $model, $enabled, $settings);

        return [
            'ok' => true,
            'message' => 'Settings updated successfully',
        ];
    }
}
