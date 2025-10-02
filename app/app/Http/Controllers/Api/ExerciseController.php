<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Exercises\ExerciseStoreRequest;
use App\Http\Requests\Exercises\ExerciseUpdateRequest;
use App\Http\Resources\V1\ExerciseResource;
use App\Models\ContentBlock;
use App\Models\Exercise;
use App\Models\ExerciseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

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

        $exerciseType = $this->resolveExerciseType($payload);

        $exercise = Exercise::create(array_merge($payload, [
            'tenant_id' => $tenantId,
            'created_by' => $userId,
            'type' => $exerciseType->key,
            'exercise_type_id' => $exerciseType->id,
            'instructions' => $payload['instructions'] ?? ($payload['content']['instructions'] ?? []),
            'custom_params' => $payload['custom_params'] ?? ($payload['content']['custom_params'] ?? []),
        ]));

        if (! empty($payload['blocks'])) {
            $exercise->contentBlocks()->sync($this->formatBlocksPayload($payload['blocks']));
        }

        return (new ExerciseResource($exercise->fresh(['contentBlocks', 'exerciseType'])))
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

        if (array_key_exists('exercise_type_id', $payload) || array_key_exists('type', $payload)) {
            $exerciseType = $this->resolveExerciseType($payload, $exercise);
            $payload['exercise_type_id'] = $exerciseType->id;
            $payload['type'] = $exerciseType->key;
        }

        $exercise->update(array_merge($payload, [
            'instructions' => $payload['instructions'] ?? ($payload['content']['instructions'] ?? $exercise->instructions),
            'custom_params' => $payload['custom_params'] ?? ($payload['content']['custom_params'] ?? $exercise->custom_params),
        ]));

        if (array_key_exists('blocks', $payload)) {
            $exercise->contentBlocks()->sync($this->formatBlocksPayload($payload['blocks'] ?? []));
        }

        return new ExerciseResource($exercise->fresh(['contentBlocks', 'exerciseType']));
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
     * @param  array<string, mixed>  $payload
     */
    private function resolveExerciseType(array $payload, ?Exercise $exercise = null): ExerciseType
    {
        if (isset($payload['exercise_type_id'])) {
            $type = ExerciseType::find($payload['exercise_type_id']);
            if ($type) {
                return $type;
            }
        }

        if (isset($payload['type'])) {
            $type = ExerciseType::where('key', $payload['type'])->first();
            if ($type) {
                return $type;
            }
        }

        if ($exercise && $exercise->relationLoaded('exerciseType') ? $exercise->exerciseType : $exercise->exerciseType()->exists()) {
            return $exercise->exerciseType;
        }

        throw ValidationException::withMessages([
            'exercise_type_id' => __('Указанный тип упражнения не найден.'),
        ]);
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
