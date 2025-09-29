<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Templates\StoreExerciseTemplateRequest;
use App\Http\Requests\Templates\UpdateExerciseTemplateRequest;
use App\Http\Resources\V1\ExerciseTemplateResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\ExerciseTemplate;

class ExerciseTemplateController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $isAdmin = ($user?->role === 'admin');

        $query = ExerciseTemplate::query();

        if ($isAdmin) {
            // Admin: может видеть все. Опциональные фильтры по tenant/type
            if ($request->filled('tenant_id')) {
                $query->where('tenant_id', $request->integer('tenant_id'));
            }
        } else {
            // Teacher: видит глобальные (tenant_id null) и свои tenant-шаблоны
            $query->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        $templates = $query->orderByDesc('id')->paginate(20);
        return ExerciseTemplateResource::collection($templates);
    }

    public function show(Request $request, ExerciseTemplate $template)
    {
        $this->authorize('view', $template);
        return new ExerciseTemplateResource($template);
    }

    public function store(StoreExerciseTemplateRequest $request)
    {
        $this->authorize('create', ExerciseTemplate::class);
        $user = $request->user();
        $isAdmin = ($user?->role === 'admin');
        $tenantId = $user?->tenant_id;

        $validated = $request->validated();

        $makeGlobal = ($validated['global'] ?? false) && $isAdmin;

        $tpl = ExerciseTemplate::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'content' => $validated['content'],
            'tenant_id' => $makeGlobal ? null : $tenantId,
            'created_by' => $user?->id,
        ]);
        return (new ExerciseTemplateResource($tpl))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateExerciseTemplateRequest $request, ExerciseTemplate $template)
    {
        $this->authorize('update', $template);

        $validated = $request->validated();

        // Перевод в global разрешен только администратором
        if (array_key_exists('global', $validated)) {
            $isAdmin = ($request->user()?->role === 'admin');
            if ($validated['global'] && $isAdmin) {
                $template->tenant_id = null;
            } elseif ($validated['global'] === false && $isAdmin) {
                $template->tenant_id = $request->user()?->tenant_id;
            }
        }

        $template->fill(collect($validated)->except('global')->all());
        $template->save();
        return new ExerciseTemplateResource($template);
    }

    public function destroy(Request $request, ExerciseTemplate $template): JsonResponse
    {
        $this->authorize('delete', $template);
        $template->delete();
        return response()->json(['deleted' => true]);
    }
}
