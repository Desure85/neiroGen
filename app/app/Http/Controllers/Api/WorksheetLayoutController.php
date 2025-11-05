<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worksheets\WorksheetLayoutStoreRequest;
use App\Http\Requests\Worksheets\WorksheetLayoutUpdateRequest;
use App\Http\Resources\V1\WorksheetLayoutResource;
use App\Models\WorksheetLayout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class WorksheetLayoutController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $tenantId = optional($request->user())->tenant_id;

        $query = WorksheetLayout::query()->orderByDesc('updated_at');

        if ($tenantId !== null) {
            $query->where(function ($builder) use ($tenantId) {
                $builder->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            });
        } else {
            $query->whereNull('tenant_id');
        }

        return WorksheetLayoutResource::collection($query->paginate(25));
    }

    public function store(WorksheetLayoutStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        $layout = WorksheetLayout::create([
            'tenant_id' => $tenantId,
            'created_by' => $user?->id,
            'name' => $request->validated('name'),
            'header_html' => $request->validated('header_html'),
            'footer_html' => $request->validated('footer_html'),
            'meta' => $request->validated('meta', []),
        ]);

        return (new WorksheetLayoutResource($layout))->response()->setStatusCode(201);
    }

    public function update(WorksheetLayoutUpdateRequest $request, WorksheetLayout $worksheetLayout): WorksheetLayoutResource
    {
        $this->authorizeTenant($worksheetLayout);
        $worksheetLayout->update($request->validated());

        return new WorksheetLayoutResource($worksheetLayout);
    }

    public function destroy(WorksheetLayout $worksheetLayout): JsonResponse
    {
        $this->authorizeTenant($worksheetLayout);
        $worksheetLayout->delete();

        return response()->json(null, 204);
    }

    public function setDefault(Request $request, WorksheetLayout $worksheetLayout): JsonResponse
    {
        $this->authorizeTenant($worksheetLayout);

        $tenantId = optional($request->user())->tenant_id;

        DB::transaction(function () use ($worksheetLayout) {
            WorksheetLayout::query()
                ->when(
                    $worksheetLayout->tenant_id !== null,
                    fn ($query) => $query->where('tenant_id', $worksheetLayout->tenant_id),
                    fn ($query) => $query->whereNull('tenant_id')
                )
                ->update(['is_default' => false]);

            $worksheetLayout->update(['is_default' => true]);
        });

        return (new WorksheetLayoutResource($worksheetLayout->fresh()))->response();
    }

    private function authorizeTenant(WorksheetLayout $layout): void
    {
        $tenantId = optional(auth()->user())->tenant_id;

        if ($tenantId !== null && $layout->tenant_id !== null && $layout->tenant_id !== $tenantId) {
            abort(404, 'Worksheet layout not found');
        }
    }
}
