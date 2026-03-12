<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChildController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Child::class, 'child');
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
}
