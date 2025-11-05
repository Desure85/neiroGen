<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assignments\GenerateIllustrationRequest;
use App\Http\Requests\Assignments\StoreAssignmentRequest;
use App\Http\Requests\Assignments\UpdateAssignmentRequest;
use App\Http\Resources\V1\AssignmentResource;
use App\Jobs\GenerateAssignmentIllustrationJob;
use App\Models\Assignment;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(Assignment::class, 'assignment');
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = ($user?->role === 'admin');
        $tenantId = $user?->tenant_id;

        $q = Assignment::query();

        if ($isAdmin) {
            if ($request->filled('tenant_id')) {
                $q->where('tenant_id', $request->integer('tenant_id'));
            }
        } else {
            $q->where('tenant_id', $tenantId);
        }

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('due_from')) {
            $q->whereDate('due_date', '>=', $request->date('due_from'));
        }
        if ($request->filled('due_to')) {
            $q->whereDate('due_date', '<=', $request->date('due_to'));
        }

        $list = $q->orderByDesc('id')->paginate(20);

        return AssignmentResource::collection($list);
    }

    public function show(Request $request, Assignment $assignment)
    {
        return new AssignmentResource($assignment);
    }

    public function store(StoreAssignmentRequest $request)
    {
        $user = $request->user();
        $isAdmin = ($user?->role === 'admin');
        $tenantId = $user?->tenant_id;
        $data = $request->validated();

        // Admin может указать tenant_id вручную, teacher — всегда свой
        $tenant = $isAdmin ? ($data['tenant_id'] ?? $tenantId) : $tenantId;

        $item = Assignment::create([
            'child_id' => $data['child_id'] ?? null,
            'exercise_template_id' => $data['exercise_template_id'],
            'status' => $data['status'] ?? 'pending',
            'due_date' => $data['due_date'] ?? null,
            'meta' => $data['meta'] ?? null,
            'tenant_id' => $tenant,
            'created_by' => $user?->id,
        ]);

        return (new AssignmentResource($item))->response()->setStatusCode(201);
    }

    public function update(UpdateAssignmentRequest $request, Assignment $assignment)
    {
        $data = $request->validated();

        // Tenant менять нельзя, кроме как админом (и то — в рамках явного запроса)
        if (array_key_exists('tenant_id', $data)) {
            if (($request->user()?->role === 'admin')) {
                $assignment->tenant_id = $data['tenant_id'];
            }
            unset($data['tenant_id']);
        }

        $assignment->fill($data);
        $assignment->save();

        return new AssignmentResource($assignment);
    }

    public function destroy(Request $request, Assignment $assignment)
    {
        $assignment->delete();

        return response()->json(['deleted' => true]);
    }

    public function generateIllustration(GenerateIllustrationRequest $request, Assignment $assignment)
    {
        $this->authorize('update', $assignment);
        $data = $request->validated();
        $payload = [
            'prompt' => $data['prompt'],
            'seed' => $data['seed'] ?? null,
            'options' => $data['options'] ?? [],
            'assignment_id' => $assignment->id,
            'tenant_id' => $assignment->tenant_id,
        ];
        dispatch(new GenerateAssignmentIllustrationJob($assignment->id, $payload));

        return response()->json(['queued' => true], 202);
    }
}
