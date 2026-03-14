<?php

namespace App\Services\AI\DTOs;

class AiGenerationResponse
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $content = null,
        public readonly ?string $error = null,
        public readonly ?string $model = null,
        public readonly ?string $provider = null,
        public readonly array $metadata = [],
    ) {}

    public static function success(string $content, array $metadata = []): self
    {
        return new self(
            success: true,
            content: $content,
            metadata: $metadata
        );
    }

    public static function error(string $error): self
    {
        return new self(
            success: false,
            error: $error
        );
    }

    public function toArray(): array
    {
        return [
            'ok' => $this->success,
            'content' => $this->content,
            'error' => $this->error,
            'model' => $this->model,
            'provider' => $this->provider,
            'metadata' => $this->metadata,
        ];
    }
}
