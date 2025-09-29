<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContentBlock;
use App\Models\Exercise;
use App\Services\ContentBlockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

class ContentBlockController extends Controller
{
    private ContentBlockService $blockService;

    public function __construct(ContentBlockService $blockService)
    {
        $this->blockService = $blockService;

        Route::bind('content_block', function ($value) {
            $block = ContentBlock::findOrFail($value);
            $user = auth()->user();

            if ($user && $user->role !== 'admin' && $block->tenant_id !== $user->tenant_id) {
                abort(403);
            }

            return $block;
        });
    }

    /**
     * Display a listing of content blocks
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|in:text,image,audio,video,interactive,drawing,choice,sequence',
            'is_template' => 'nullable|boolean',
            'search' => 'nullable|string|min:1',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        $user = $request->user();
        $query = ContentBlock::where('tenant_id', $user?->tenant_id);
        if (isset($validated['type'])) {
            $query->byType($validated['type']);
        }

        if (isset($validated['is_template'])) {
            $query->where('is_template', $validated['is_template']);
        }

        if (isset($validated['search'])) {
            $blocks = $this->blockService->searchBlocks($validated['search'], $validated['type'] ?? null, $user);
        } else {
            // Show all blocks of tenant by default (not only the creator)
            $blocks = $query
                ->orderBy('created_at', 'desc')
                ->paginate($validated['per_page'] ?? 15);
        }

        return response()->json($blocks);
    }

    /**
     * Store a newly created content block
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ContentBlock::class);
        $validated = $request->validate([
            'type' => 'required|string|in:text,image,audio,video,interactive,drawing,choice,sequence',
            'title' => 'required|string|max:255',
            'content' => 'required|array',
            'metadata' => 'nullable|array',
            'settings' => 'nullable|array',
            'is_template' => 'nullable|boolean'
        ]);

        try {
            $block = $this->blockService->createBlock($validated, $request->user());

            return response()->json($block, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Display the specified content block
     */
    public function show(Request $request, ContentBlock $content_block): JsonResponse
    {
        $this->authorize('view', $content_block);

        $content_block->load(['creator', 'exercises' => function ($query) {
            $query->select('exercises.id', 'exercises.title', 'exercises.type');
        }]);

        return response()->json([
            'block' => $content_block,
            'analytics' => $this->blockService->getBlockAnalytics($content_block)
        ]);
    }

    /**
     * Update the specified content block
     */
    public function update(Request $request, ContentBlock $content_block): JsonResponse
    {
        $this->authorize('update', $content_block);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|array',
            'metadata' => 'nullable|array',
            'settings' => 'nullable|array',
            'is_template' => 'nullable|boolean'
        ]);

        // Ensure the block type is always passed for validation rules that depend on it
        $validated['type'] = $content_block->type;

        try {
            $updatedBlock = $this->blockService->updateBlock($content_block, $validated);

            return response()->json($updatedBlock);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Remove the specified content block
     */
    public function destroy(Request $request, ContentBlock $content_block): JsonResponse
    {
        $this->authorize('delete', $content_block);

        try {
            $this->blockService->deleteBlock($content_block);

            return response()->json(null, 204);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get template blocks
     */
    public function templates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|in:text,image,audio,video,interactive,drawing,choice,sequence'
        ]);

        $templates = $this->blockService->getTemplateBlocks($validated['type'] ?? null, $request->user());

        return response()->json($templates);
    }

    /**
     * Create exercise from blocks
     */
    public function createExercise(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'block_ids' => 'required|array|min:1',
            'block_ids.*' => 'integer|exists:content_blocks,id',
            'exercise_data' => 'required|array',
            'exercise_data.title' => 'required|string|max:255',
            'exercise_data.description' => 'nullable|string',
            'exercise_data.type' => 'required|string',
            'exercise_data.difficulty' => 'required|string|in:easy,medium,hard',
            'exercise_data.estimated_duration' => 'nullable|integer|min:1',
            'exercise_data.tags' => 'nullable|array',
            'delays' => 'nullable|array'
        ]);

        try {
            $exercise = $this->blockService->createExerciseFromBlocks(
                $validated['block_ids'],
                array_merge($validated['exercise_data'], ['delays' => $validated['delays'] ?? []])
            );

            return response()->json($exercise, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Duplicate a content block
     */
    public function duplicate(Request $request, ContentBlock $block): JsonResponse
    {
        $this->authorize('view', $block);

        try {
            $newBlock = $this->blockService->duplicateBlock($block, $request->user());

            return response()->json($newBlock, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Export content block
     */
    public function export(Request $request, ContentBlock $block): JsonResponse
    {
        $this->authorize('view', $block);

        try {
            $exportData = $this->blockService->exportBlock($block);

            return response()->json($exportData);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Import content block
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'block_data' => 'required|array',
            'block_data.type' => 'required|string|in:text,image,audio,video,interactive,drawing,choice,sequence',
            'block_data.title' => 'required|string|max:255',
            'block_data.content' => 'required|array'
        ]);

        try {
            $block = $this->blockService->importBlock($validated['block_data'], $request->user());

            return response()->json($block, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get popular blocks
     */
    public function popular(): JsonResponse
    {
        $blocks = $this->blockService->getPopularBlocks(10);

        return response()->json($blocks);
    }

    /**
     * Validate block compatibility with exercise
     */
    public function validateForExercise(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'block_id' => 'required|integer|exists:content_blocks,id',
            'exercise_id' => 'required|integer|exists:exercises,id'
        ]);

        $block = ContentBlock::find($validated['block_id']);
        $exercise = Exercise::find($validated['exercise_id']);

        $errors = $this->blockService->validateBlockForExercise($block, $exercise);

        return response()->json([
            'compatible' => empty($errors),
            'errors' => $errors
        ]);
    }

    /**
     * Upload file for content block
     */
    public function uploadFile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB
            'type' => 'required|string|in:image,audio,video'
        ]);

        try {
            $path = $validated['file']->store("content-blocks/{$validated['type']}", 'public');

            return response()->json([
                'path' => $path,
                'url' => Storage::url($path),
                'size' => $validated['file']->getSize(),
                'mime_type' => $validated['file']->getMimeType()
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Get interactive types
     */
    public function interactiveTypes(): JsonResponse
    {
        return response()->json(ContentBlock::INTERACTIVE_TYPES);
    }

    /**
     * Get block types
     */
    public function blockTypes(): JsonResponse
    {
        return response()->json(ContentBlock::TYPES);
    }
}
