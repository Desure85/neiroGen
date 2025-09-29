<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExerciseSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExerciseSessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => 'nullable|integer|exists:children,id',
            'per_page' => 'nullable|integer|min:1|max:100'
        ]);

        $query = ExerciseSession::query()->orderBy('created_at', 'desc');
        if (isset($validated['child_id'])) {
            $query->where('child_id', $validated['child_id']);
        }

        $sessions = $query->paginate($validated['per_page'] ?? 20);
        return response()->json($sessions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => 'required|integer|exists:children,id',
            'exercise_id' => 'nullable|integer|exists:exercises,id',
            'score' => 'required|integer|min:0',
            'completed_items' => 'required|integer|min:0',
            'total_items' => 'required|integer|min:0',
            'time_spent' => 'required|integer|min:0',
            'accuracy' => 'required|integer|min:0|max:100',
            'started_at' => 'nullable|date',
            'finished_at' => 'nullable|date',
            'metadata' => 'nullable|array',
        ]);

        $session = ExerciseSession::create($validated);
        return response()->json($session, 201);
    }

    public function show(ExerciseSession $session): JsonResponse
    {
        return response()->json($session);
    }
}
