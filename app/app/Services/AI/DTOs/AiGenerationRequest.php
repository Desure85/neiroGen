<?php

namespace App\Services\AI\DTOs;

use InvalidArgumentException;

class AiGenerationRequest
{
    public const CONTENT_TYPE_TEXT = 'text';
    public const CONTENT_TYPE_IMAGE = 'image';
    public const CONTENT_TYPE_AUDIO = 'audio';
    public const CONTENT_TYPE_EXERCISE = 'exercise';

    public function __construct(
        public readonly string $prompt,
        public readonly string $contentType,
        public readonly array $parameters = [],
        public readonly ?string $model = null,
    ) {
        if (!in_array($contentType, self::validContentTypes(), true)) {
            throw new InvalidArgumentException(
                sprintf(
                    'Invalid content type: %s. Valid types: %s',
                    $contentType,
                    implode(', ', self::validContentTypes())
                )
            );
        }
    }

    public static function validContentTypes(): array
    {
        return [
            self::CONTENT_TYPE_TEXT,
            self::CONTENT_TYPE_IMAGE,
            self::CONTENT_TYPE_AUDIO,
            self::CONTENT_TYPE_EXERCISE,
        ];
    }

    public static function forText(string $prompt, array $parameters = []): self
    {
        return new self($prompt, self::CONTENT_TYPE_TEXT, $parameters);
    }

    public static function forImage(string $prompt, array $parameters = []): self
    {
        return new self($prompt, self::CONTENT_TYPE_IMAGE, $parameters);
    }

    public static function forExercise(string $prompt, array $parameters = []): self
    {
        return new self($prompt, self::CONTENT_TYPE_EXERCISE, $parameters);
    }
}
