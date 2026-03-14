<?php

/**
 * AI Provider Configuration
 * 
 * This configuration centralizes AI provider settings.
 * Each provider can be configured for different content types.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Provider Configuration
    |--------------------------------------------------------------------------
    |
    | Configure each AI provider here. Set 'enabled' to true to activate.
    | Each provider can have its own API key, endpoint, and default model.
    |
    */
    'providers' => [
        'openai' => [
            'enabled' => env('AI_OPENAI_ENABLED', false),
            'api_key' => env('AI_OPENAI_API_KEY'),
            'organization' => env('AI_OPENAI_ORG'),
            'endpoint' => env('AI_OPENAI_ENDPOINT', 'https://api.openai.com/v1'),
            'default_model' => env('AI_OPENAI_DEFAULT_MODEL', 'gpt-4o'),
            'image_model' => env('AI_OPENAI_IMAGE_MODEL', 'dall-e-3'),
            'timeout' => env('AI_OPENAI_TIMEOUT', 120),
        ],

        'anthropic' => [
            'enabled' => env('AI_ANTHROPIC_ENABLED', false),
            'api_key' => env('AI_ANTHROPIC_API_KEY'),
            'endpoint' => env('AI_ANTHROPIC_ENDPOINT', 'https://api.anthropic.com/v1'),
            'default_model' => env('AI_ANTHROPIC_DEFAULT_MODEL', 'claude-3-5-sonnet-20241022'),
            'timeout' => env('AI_ANTHROPIC_TIMEOUT', 120),
        ],

        'google' => [
            'enabled' => env('AI_GOOGLE_ENABLED', false),
            'api_key' => env('AI_GOOGLE_API_KEY'),
            'endpoint' => env('AI_GOOGLE_ENDPOINT', 'https://generativelanguage.googleapis.com/v1'),
            'default_model' => env('AI_GOOGLE_DEFAULT_MODEL', 'gemini-2.0-flash-exp'),
            'timeout' => env('AI_GOOGLE_TIMEOUT', 120),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Content Type to Provider Mapping
    |--------------------------------------------------------------------------
    |
    | Define which provider handles each content type.
    | You can use different providers for different content types.
    |
    | Supported content types:
    | - text: Text generation, summaries, translations
    | - image: Image generation (if provider supports it)
    | - audio: Audio processing and generation
    | - exercise: Exercise content generation (instructions, tasks)
    |
    */
    'content_types' => [
        'text' => env('AI_PROVIDER_TEXT', 'openai'),
        'image' => env('AI_PROVIDER_IMAGE', 'openai'),
        'audio' => env('AI_PROVIDER_AUDIO', 'openai'),
        'exercise' => env('AI_PROVIDER_EXERCISE', 'openai'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Parameters
    |--------------------------------------------------------------------------
    |
    | Default parameters for generation requests
    |
    */
    'defaults' => [
        'text' => [
            'temperature' => 0.7,
            'max_tokens' => 2000,
        ],
        'image' => [
            'size' => '1024x1024',
            'quality' => 'standard',
            'n' => 1,
        ],
        'exercise' => [
            'temperature' => 0.8,
            'max_tokens' => 4000,
        ],
    ],
];
