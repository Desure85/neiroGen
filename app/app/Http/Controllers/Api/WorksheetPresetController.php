<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worksheets\WorksheetPresetStoreRequest;
use App\Http\Requests\Worksheets\WorksheetPresetUpdateRequest;
use App\Http\Resources\V1\WorksheetPresetResource;
use App\Models\WorksheetPreset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class WorksheetPresetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        $query = WorksheetPreset::query()->orderByDesc('updated_at');

        if ($tenantId !== null) {
            $query->where(function ($builder) use ($tenantId) {
                $builder->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            });
        } else {
            $query->whereNull('tenant_id');
        }

        return WorksheetPresetResource::collection($query->paginate(25));
    }

    public function store(WorksheetPresetStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        $preset = WorksheetPreset::create([
            'tenant_id' => $tenantId,
            'created_by' => $user?->id,
            'name' => $request->validated('name'),
            'fields' => $request->validated('fields'),
        ]);

        return (new WorksheetPresetResource($preset))->response()->setStatusCode(201);
    }

    public function update(WorksheetPresetUpdateRequest $request, WorksheetPreset $worksheetPreset): WorksheetPresetResource
    {
        $this->authorizeTenant($worksheetPreset);

        $payload = $request->validated();

        DB::transaction(function () use ($worksheetPreset, $payload) {
            $worksheetPreset->update($payload);
        });

        return new WorksheetPresetResource($worksheetPreset);
    }

    public function destroy(WorksheetPreset $worksheetPreset): JsonResponse
    {
        $this->authorizeTenant($worksheetPreset);
        $worksheetPreset->delete();

        return response()->json(null, 204);
    }

    public function setDefault(Request $request, WorksheetPreset $worksheetPreset): JsonResponse
    {
        $this->authorizeTenant($worksheetPreset);

        DB::transaction(function () use ($worksheetPreset) {
            WorksheetPreset::query()
                ->when(
                    $worksheetPreset->tenant_id !== null,
                    fn ($query) => $query->where('tenant_id', $worksheetPreset->tenant_id),
                    fn ($query) => $query->whereNull('tenant_id')
                )
                ->update(['is_default' => false]);

            $worksheetPreset->update(['is_default' => true]);
        });

        return (new WorksheetPresetResource($worksheetPreset->fresh()))->response();
    }

    private function authorizeTenant(WorksheetPreset $preset): void
    {
        $user = auth()->user();
        $tenantId = $user?->tenant_id;

        if ($tenantId !== null && $preset->tenant_id !== null && $preset->tenant_id !== $tenantId) {
            abort(404, 'Worksheet preset not found');
        }
    }
}
