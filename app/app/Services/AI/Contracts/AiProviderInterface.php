<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\DTOs\AiGenerationRequest;
use App\Services\AI\DTOs\AiGenerationResponse;

interface AiProviderInterface
{
    /**
     * Get the provider name (e.g., 'openai', 'anthropic', 'google')
     */
    public function getName(): string;

    /**
     * Get the content types this provider supports
     */
    public function getSupportedContentTypes(): array;

    /**
     * Generate content using the AI provider
     */
    public function generate(AiGenerationRequest $request): AiGenerationResponse;

    /**
     * Check if the provider is available and configured
     */
    public function isAvailable(): bool;

    /**
     * Get provider health status
     */
    public function healthCheck(): array;
}
