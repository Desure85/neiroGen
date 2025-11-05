<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChildProgress;
use App\Models\Exercise;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChildProgressController extends Controller
{
    /**
     * Display progress for current user.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $progress = ChildProgress::with('exercise')
            ->where('user_id', $userId)
            ->paginate(20);

        return response()->json($progress);
    }

    /**
     * Record progress for an exercise.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exercise_id' => 'required|exists:exercises,id',
            'score' => 'required|integer|min:0|max:100',
            'metadata' => 'nullable|array',
        ]);

        $userId = Auth::id();
        $exerciseId = $validated['exercise_id'];

        $progress = ChildProgress::updateOrCreate(
            ['user_id' => $userId, 'exercise_id' => $exerciseId],
            [
                'score' => $validated['score'],
                'attempts' => \DB::raw('attempts + 1'),
                'completed_at' => now(),
                'metadata' => $validated['metadata'] ?? [],
            ]
        );

        return response()->json($progress, 201);
    }

    /**
     * Display progress for specific exercise.
     */
    public function show(Exercise $exercise): JsonResponse
    {
        $userId = Auth::id();
        $progress = ChildProgress::where('user_id', $userId)
            ->where('exercise_id', $exercise->id)
            ->first();

        return response()->json($progress);
    }
}
