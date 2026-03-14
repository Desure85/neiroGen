<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExerciseTypeRequest;
use App\Http\Requests\Admin\UpdateExerciseTypeRequest;
use App\Http\Resources\Admin\V1\ExerciseTypeResource;
use App\Models\Exercise;
use App\Models\ExerciseType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExerciseTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ExerciseType::query()
            ->withCount(['fields', 'exercises'])
            ->when(! $request->boolean('show_inactive', false), fn (Builder $builder) => $builder->where('is_active', true))
            ->when($request->filled('domain'), fn (Builder $builder) => $builder->where('domain', $request->string('domain')->trim()))
            ->when($request->filled('search'), function (Builder $builder) use ($request) {
                $term = '%'.str_replace('%', '', $request->string('search')->trim()).'%';

                $builder->where(function (Builder $nested) use ($term) {
                    $nested
                        ->where('name', 'ILIKE', $term)
                        ->orWhere('key', 'ILIKE', $term)
                        ->orWhere('description', 'ILIKE', $term)
                        ->orWhere('domain', 'ILIKE', $term);
                });
            })
            ->orderBy('display_order')
            ->orderBy('name');

        $types = $query->get();

        return ExerciseTypeResource::collection($types)
            ->additional([
                'meta' => [
                    'total' => $types->count(),
                ],
            ])
            ->response();
    }

    public function store(StoreExerciseTypeRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $data = $request->validated();

            $data['display_order'] = $data['display_order'] ?? ((ExerciseType::max('display_order') ?? -1) + 1);
            $data['meta'] = $data['meta'] ?? null;
            $data['is_active'] = $data['is_active'] ?? true;

            $exerciseType = ExerciseType::create($data);
            $exerciseType->loadCount(['fields', 'exercises']);

            return (new ExerciseTypeResource($exerciseType))
                ->response()
                ->setStatusCode(201);
        });
    }

    public function show(ExerciseType $exerciseType): ExerciseTypeResource
    {
        $exerciseType->load(['fields' => fn ($query) => $query->orderBy('display_order')])->loadCount(['fields', 'exercises']);

        return new ExerciseTypeResource($exerciseType);
    }

    public function update(UpdateExerciseTypeRequest $request, ExerciseType $exerciseType): ExerciseTypeResource
    {
        DB::transaction(function () use ($request, $exerciseType) {
            $data = $request->validated();
            $data['meta'] = $data['meta'] ?? null;

            $originalKey = $exerciseType->key;

            $exerciseType->update($data);

            if ($originalKey !== $exerciseType->key) {
                Exercise::query()
                    ->where('exercise_type_id', $exerciseType->id)
                    ->update(['type' => $exerciseType->key]);
            }
        });

        $exerciseType->load(['fields' => fn ($query) => $query->orderBy('display_order')])->loadCount(['fields', 'exercises']);

        return new ExerciseTypeResource($exerciseType);
    }

    public function destroy(ExerciseType $exerciseType): JsonResponse
    {
        $hasExercises = Exercise::query()->where('exercise_type_id', $exerciseType->id)->exists();

        if ($hasExercises) {
            return response()->json([
                'message' => __('Нельзя удалить тип упражнения, пока к нему привязаны упражнения.'),
            ], 409);
        }

        $exerciseType->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /admin/exercise-types/{exerciseType}/prompts
     * Get AI prompts for an exercise type
     */
    public function prompts(ExerciseType $exerciseType): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'prompts' => $exerciseType->getPrompts(),
            'types' => ExerciseType::getPromptTypes(),
        ]);
    }

    /**
     * PUT /admin/exercise-types/{exerciseType}/prompts
     * Update AI prompts for an exercise type
     */
    public function updatePrompts(Request $request, ExerciseType $exerciseType): JsonResponse
    {
        $request->validate([
            'prompts' => 'required|array',
            'prompts.instructions' => 'nullable|string',
            'prompts.content' => 'nullable|string',
            'prompts.solution' => 'nullable|string',
            'prompts.variations' => 'nullable|string',
        ]);

        $exerciseType->setPrompts($request->input('prompts'));
        $exerciseType->save();

        return response()->json([
            'ok' => true,
            'message' => 'Промпты сохранены',
            'prompts' => $exerciseType->getPrompts(),
        ]);
    }

    /**
     * GET /admin/exercise-types/{exerciseType}/delivery-types
     * Get delivery types for an exercise type
     */
    public function deliveryTypes(ExerciseType $exerciseType): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'delivery_types' => $exerciseType->getDeliveryTypes(),
            'options' => ExerciseType::getDeliveryTypeOptions(),
        ]);
    }

    /**
     * PUT /admin/exercise-types/{exerciseType}/delivery-types
     * Update delivery types for an exercise type
     */
    public function updateDeliveryTypes(Request $request, ExerciseType $exerciseType): JsonResponse
    {
        $request->validate([
            'delivery_types' => 'required|array|min:1',
            'delivery_types.*' => 'required|string|in:online,printable',
        ]);

        $exerciseType->setDeliveryTypes($request->input('delivery_types'));
        $exerciseType->save();

        return response()->json([
            'ok' => true,
            'message' => 'Типы выполнения сохранены',
            'delivery_types' => $exerciseType->getDeliveryTypes(),
        ]);
    }
}
