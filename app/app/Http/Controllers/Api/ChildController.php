<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChildController extends Controller
{
    protected GamificationService $gamificationService;

    public function __construct()
    {
        $this->authorizeResource(Child::class, 'child');
        $this->gamificationService = new GamificationService();
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id;
        $perPage = max(1, min(100, (int) $request->get('per_page', 50)));
        $query = Child::where('tenant_id', $tenantId)->orderBy('created_at', 'desc');
        if ($q = $request->get('search')) {
            $query->where('name', 'ILIKE', "%$q%");
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Child::class);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:0|max:120',
            'gender' => 'nullable|in:male,female',
            'avatar' => 'nullable|string|max:32',
        ]);

        $tenantId = $request->user()?->tenant_id;
        $userId = $request->user()?->id;

        $child = Child::create([
            'name' => $validated['name'],
            'age' => $validated['age'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'avatar' => $validated['avatar'] ?? null,
            'overall_progress' => 0,
            'tenant_id' => $tenantId,
            'created_by' => $userId,
        ]);

        return response()->json($child, 201);
    }

    public function show(Request $request, Child $child): JsonResponse
    {
        // Verify tenant ownership
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');
        
        return response()->json($child);
    }

    public function update(Request $request, Child $child): JsonResponse
    {
        // Verify tenant ownership
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'age' => 'sometimes|integer|min:1|max:18',
            'gender' => 'sometimes|in:male,female',
            'avatar' => 'sometimes|string|nullable',
        ]);

        $child->update($validated);

        return response()->json($child);
    }

    public function destroy(Request $request, Child $child): JsonResponse
    {
        // Verify tenant ownership
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');
        
        $child->delete();

        return response()->json(null, 204);
    }

    /**
     * Get gamification stats for a child
     */
    public function gamification(Request $request, Child $child): JsonResponse
    {
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');

        return response()->json($child->getGamificationStats());
    }

    /**
     * Get all achievements (unlocked and locked)
     */
    public function achievements(Request $request, Child $child): JsonResponse
    {
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');

        $achievements = $this->gamificationService->getAllAchievements($child);

        return response()->json([
            'achievements' => $achievements,
            'unlocked_count' => count(array_filter($achievements, fn($a) => $a['unlocked'])),
            'total_count' => count($achievements),
        ]);
    }

    /**
     * Record exercise completion and update gamification
     */
    public function completeExercise(Request $request, Child $child): JsonResponse
    {
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');

        $validated = $request->validate([
            'time_spent' => 'nullable|integer|min:0',
        ]);

        $timeSpent = $validated['time_spent'] ?? 0;
        $result = $this->gamificationService->recordExerciseComplete($child, $timeSpent);

        return response()->json($result);
    }

    /**
     * Update avatar theme
     */
    public function updateAvatarTheme(Request $request, Child $child): JsonResponse
    {
        abort_if($child->tenant_id !== $request->user()?->tenant_id, 404, 'Child not found');

        $validated = $request->validate([
            'theme' => 'required|string',
        ]);

        $success = $this->gamificationService->setAvatarTheme($child, $validated['theme']);

        if (!$success) {
            return response()->json([
                'ok' => false,
                'error' => 'Invalid theme',
                'available_themes' => $this->gamificationService->getAvatarThemes(),
            ], 400);
        }

        return response()->json([
            'ok' => true,
            'avatar_theme' => $child->avatar_theme,
        ]);
    }
}
