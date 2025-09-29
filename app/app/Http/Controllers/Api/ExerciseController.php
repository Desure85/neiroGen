<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exercises\ExerciseStoreRequest;
use App\Http\Requests\Exercises\ExerciseUpdateRequest;
use App\Http\Resources\V1\ExerciseResource;
use App\Models\ContentBlock;
use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExerciseController extends Controller
{
    /**
     * Display a listing of exercises.
     */
    public function index(): AnonymousResourceCollection
    {
        $tenantId = optional(auth()->user())->tenant_id ?? 1;

        $query = Exercise::query()
            ->where('tenant_id', $tenantId)
            ->with('contentBlocks');

        $request = request();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($difficulty = $request->query('difficulty')) {
            $query->where('difficulty', $difficulty);
        }

        if (! is_null($request->query('active'))) {
            $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        if ($tag = $request->query('tag')) {
            $query->whereJsonContains('tags', $tag);
        }

        $perPage = (int) $request->query('per_page', 15);

        return ExerciseResource::collection($query->paginate($perPage));
    }

    /**
     * Store a newly created exercise.
     */
    public function store(ExerciseStoreRequest $request): JsonResponse
    {
        $tenantId = optional($request->user())->tenant_id ?? 1;
        $userId = optional($request->user())->id;

        $payload = $request->validated();

        $exercise = Exercise::create(array_merge($payload, [
            'tenant_id' => $tenantId,
            'created_by' => $userId,
            'instructions' => $payload['instructions'] ?? ($payload['content']['instructions'] ?? []),
            'custom_params' => $payload['custom_params'] ?? ($payload['content']['custom_params'] ?? []),
        ]));

        if (! empty($payload['blocks'])) {
            $exercise->contentBlocks()->sync($this->formatBlocksPayload($payload['blocks']));
        }

        return (new ExerciseResource($exercise->fresh('contentBlocks')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified exercise.
     */
    public function show(Exercise $exercise): ExerciseResource
    {
        $this->authorizeTenant($exercise);

        return new ExerciseResource($exercise->load('contentBlocks'));
    }

    /**
     * Update the specified exercise.
     */
    public function update(ExerciseUpdateRequest $request, Exercise $exercise): ExerciseResource
    {
        $this->authorizeTenant($exercise);

        $payload = $request->validated();

        $exercise->update(array_merge($payload, [
            'instructions' => $payload['instructions'] ?? ($payload['content']['instructions'] ?? $exercise->instructions),
            'custom_params' => $payload['custom_params'] ?? ($payload['content']['custom_params'] ?? $exercise->custom_params),
        ]));

        if (array_key_exists('blocks', $payload)) {
            $exercise->contentBlocks()->sync($this->formatBlocksPayload($payload['blocks'] ?? []));
        }

        return new ExerciseResource($exercise->fresh('contentBlocks'));
    }

    /**
     * Remove the specified exercise.
     */
    public function destroy(Exercise $exercise): JsonResponse
    {
        $this->authorizeTenant($exercise);

        $exercise->delete();

        return response()->json(null, 204);
    }

    private function authorizeTenant(Exercise $exercise): void
    {
        $tenantId = optional(auth()->user())->tenant_id ?? 1;

        abort_if($exercise->tenant_id !== $tenantId, 404, 'Exercise not found');
    }

    /**
     * @param array<int, array{id:int, order?:int, delay?:int, settings?:array}> $blocks
     * @return array<int, array{order:int, delay:int, settings:array}>
     */
    private function formatBlocksPayload(array $blocks): array
    {
        $payload = [];

        foreach ($blocks as $position => $block) {
            $contentBlock = ContentBlock::find($block['id']);

            if (! $contentBlock) {
                continue;
            }

            $order = $block['order'] ?? ($position + 1);

            $settings = $block['settings'] ?? null;

            $payload[$contentBlock->id] = [
                'order' => $order,
                'delay' => $block['delay'] ?? 0,
                'settings' => $settings === null ? null : json_encode($settings),
            ];
        }

        return $payload;
    }
}
