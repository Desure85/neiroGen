<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreExerciseTypeFieldRequest;
use App\Http\Resources\Admin\V1\ExerciseTypeFieldResource;
use App\Models\ExerciseType;
use App\Models\ExerciseTypeField;
use Illuminate\Http\JsonResponse;

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

    public function destroy(ExerciseType $exerciseType, ExerciseTypeField $exerciseTypeField): JsonResponse
    {
        abort_if($exerciseTypeField->exercise_type_id !== $exerciseType->id, 404);

        $exerciseTypeField->delete();

        return response()->json(null, 204);
    }
}
