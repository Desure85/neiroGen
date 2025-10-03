<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderExerciseTypeFieldsRequest;
use App\Http\Requests\Admin\StoreExerciseTypeFieldRequest;
use App\Http\Requests\Admin\UpdateExerciseTypeFieldRequest;
use App\Http\Resources\Admin\V1\ExerciseTypeFieldResource;
use App\Models\ExerciseType;
use App\Models\ExerciseTypeField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ExerciseTypeFieldController extends Controller
{
    public function store(StoreExerciseTypeFieldRequest $request, ExerciseType $exerciseType): JsonResponse
    {
        $data = $request->validated();

        $data['display_order'] = $data['display_order'] ?? (($exerciseType->fields()->max('display_order') ?? -1) + 1);

        $field = $exerciseType->fields()->create($data);

        return (new ExerciseTypeFieldResource($field->fresh()))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateExerciseTypeFieldRequest $request,
        ExerciseType $exerciseType,
        ExerciseTypeField $exerciseTypeField,
    ): ExerciseTypeFieldResource {
        abort_if($exerciseTypeField->exercise_type_id !== $exerciseType->id, 404);

        $exerciseTypeField->update($request->validated());

        return new ExerciseTypeFieldResource($exerciseTypeField->fresh());
    }

    public function destroy(ExerciseType $exerciseType, ExerciseTypeField $exerciseTypeField): JsonResponse
    {
        abort_if($exerciseTypeField->exercise_type_id !== $exerciseType->id, 404);

        $exerciseTypeField->delete();

        return response()->json(null, 204);
    }

    public function reorder(
        ReorderExerciseTypeFieldsRequest $request,
        ExerciseType $exerciseType,
    ): Response {
        $order = $request->validated()['order'];

        DB::transaction(function () use ($exerciseType, $order) {
            $position = 0;

            foreach ($order as $fieldId) {
                $exerciseType
                    ->fields()
                    ->whereKey($fieldId)
                    ->update(['display_order' => $position++]);
            }

            $exerciseType
                ->fields()
                ->whereNotIn('id', $order)
                ->orderBy('display_order')
                ->pluck('id')
                ->each(function ($fieldId) use ($exerciseType, &$position) {
                    $exerciseType
                        ->fields()
                        ->whereKey($fieldId)
                        ->update(['display_order' => $position++]);
                });
        });

        return response()->noContent();
    }
}
