<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AI\AiService;
use App\Services\AI\DTOs\AiGenerationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(
        protected AiService $aiService
    ) {}

    /**
     * GET /api/ai/health
     * Check health status of all AI providers (only enabled ones)
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'providers' => $this->aiService->healthCheck(),
        ]);
    }

    /**
     * GET /api/ai/providers
     * Get all available providers (including unconfigured ones)
     */
    public function providers(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'providers' => $this->aiService->getAllProviders(),
        ]);
    }

    /**
     * PUT /api/ai/providers/{provider}
     * Update provider settings
     */
    public function updateProvider(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'api_key' => 'nullable|string',
            'model' => 'nullable|string',
            'enabled' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        // Handle api_key: null = keep existing, empty string = clear, value = update
        $apiKey = $request->input('api_key');
        if ($apiKey === '' || $apiKey === 'clear') {
            // User explicitly wants to clear the API key
            $apiKey = null;
        }

        $result = $this->aiService->updateProviderSettings(
            $provider,
            $apiKey,
            $request->input('model'),
            $request->input('enabled', false),
            $request->input('settings')
        );

        return response()->json($result);
    }

    /**
     * POST /api/ai/generate
     * Generate content using AI
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string',
            'content_type' => 'required|string|in:text,image,audio,exercise',
            'parameters' => 'nullable|array',
            'model' => 'nullable|string',
        ]);

        $aiRequest = new AiGenerationRequest(
            prompt: $request->input('prompt'),
            contentType: $request->input('content_type'),
            parameters: $request->input('parameters', []),
            model: $request->input('model'),
        );

        $response = $this->aiService->generate($aiRequest);

        return response()->json($response->toArray());
    }

    /**
     * POST /api/ai/text
     * Generate text content
     */
    public function generateText(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string',
            'parameters' => 'nullable|array',
            'model' => 'nullable|string',
        ]);

        $response = $this->aiService->generateText(
            $request->input('prompt'),
            $request->input('parameters', [])
        );

        return response()->json($response->toArray());
    }

    /**
     * POST /api/ai/image
     * Generate image content
     */
    public function generateImage(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string',
            'parameters' => 'nullable|array',
            'model' => 'nullable|string',
        ]);

        $response = $this->aiService->generateImage(
            $request->input('prompt'),
            $request->input('parameters', [])
        );

        return response()->json($response->toArray());
    }

    /**
     * POST /api/ai/exercise
     * Generate exercise content
     */
    public function generateExercise(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string',
            'parameters' => 'nullable|array',
            'model' => 'nullable|string',
        ]);

        $response = $this->aiService->generateExercise(
            $request->input('prompt'),
            $request->input('parameters', [])
        );

        return response()->json($response->toArray());
    }
}
