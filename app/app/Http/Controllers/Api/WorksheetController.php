<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Worksheets\WorksheetItemRegenerateRequest;
use App\Http\Requests\Worksheets\WorksheetStoreRequest;
use App\Http\Requests\Worksheets\WorksheetUpdateRequest;
use App\Http\Resources\V1\WorksheetItemResource;
use App\Http\Resources\V1\WorksheetResource;
use App\Jobs\GenerateWorksheetJob;
use App\Models\Worksheet;
use App\Models\WorksheetItem;
use App\Models\WorksheetItemRegeneration;
use App\Services\WorksheetPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class WorksheetController extends Controller
{
    public function __construct(private WorksheetPdfService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        $query = Worksheet::query()
            ->with([
                'child:id,name,avatar,age,overall_progress,last_session_at,tenant_id',
                'layout:id,name,tenant_id',
            ])
            ->orderByDesc('created_at');

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        } elseif ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        if ($childId = $request->query('child_id')) {
            $query->where('child_id', (int) $childId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($format = $request->query('format')) {
            $query->where('format', strtoupper($format));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($builder) use ($search) {
                $builder->where('title', 'ILIKE', "%{$search}%")
                    ->orWhere('notes', 'ILIKE', "%{$search}%");
            });
        }

        $perPage = max(1, (int) $request->query('per_page', 15));

        return WorksheetResource::collection($query->paginate($perPage));
    }

    public function store(WorksheetStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $payload = $request->validated();

        $worksheet = DB::transaction(function () use ($payload, $tenantId, $user) {
            $worksheet = Worksheet::create([
                'tenant_id' => $tenantId,
                'created_by' => $user?->id,
                'title' => $payload['title'],
                'status' => $payload['status'] ?? 'draft',
                'format' => strtoupper($payload['format'] ?? 'A4'),
                'copies' => $payload['copies'] ?? 1,
                'notes' => $payload['notes'] ?? null,
                'child_id' => $payload['child_id'] ?? null,
                'worksheet_layout_id' => $payload['worksheet_layout_id'] ?? null,
                'header_html' => $payload['header_html'] ?? null,
                'footer_html' => $payload['footer_html'] ?? null,
                'fields_snapshot' => $payload['fields_snapshot'] ?? [],
                'meta' => $payload['meta'] ?? [],
            ]);

            foreach ($payload['items'] as $index => $item) {
                $worksheet->items()->create([
                    'exercise_id' => $item['exercise_id'] ?? null,
                    'position' => $index + 1,
                    'title' => $item['title'] ?? ($item['content_snapshot']['title'] ?? 'Задание '.($index + 1)),
                    'instructions' => $item['instructions'] ?? [],
                    'content_snapshot' => $item['content_snapshot'],
                    'can_regenerate' => $item['can_regenerate'] ?? false,
                ]);
            }

            return $worksheet->load(['items', 'layout', 'child']);
        });

        return (new WorksheetResource($worksheet))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Worksheet $worksheet): WorksheetResource
    {
        $this->authorizeTenant($worksheet);

        return new WorksheetResource($worksheet->load(['items', 'layout', 'child']));
    }

    public function update(WorksheetUpdateRequest $request, Worksheet $worksheet): WorksheetResource
    {
        $this->authorizeTenant($worksheet);
        $payload = $request->validated();

        DB::transaction(function () use ($worksheet, $payload) {
            $updatable = [];

            foreach (['title', 'status', 'copies', 'notes', 'fields_snapshot', 'meta', 'worksheet_layout_id', 'header_html', 'footer_html', 'child_id'] as $field) {
                if (array_key_exists($field, $payload)) {
                    $updatable[$field] = $payload[$field];
                }
            }

            if (array_key_exists('format', $payload)) {
                $updatable['format'] = strtoupper($payload['format']);
            }

            if (! empty($updatable)) {
                $worksheet->fill($updatable);
                $worksheet->save();
            }

            if (array_key_exists('items', $payload)) {
                $keepIds = [];

                foreach ($payload['items'] as $index => $itemData) {
                    $attributes = [
                        'exercise_id' => $itemData['exercise_id'] ?? null,
                        'position' => $index + 1,
                        'title' => $itemData['title'] ?? ($itemData['content_snapshot']['title'] ?? 'Задание '.($index + 1)),
                        'instructions' => $itemData['instructions'] ?? [],
                        'content_snapshot' => $itemData['content_snapshot'],
                        'can_regenerate' => $itemData['can_regenerate'] ?? false,
                    ];

                    if (! empty($itemData['id'])) {
                        /** @var WorksheetItem|null $item */
                        $item = $worksheet->items()->whereKey($itemData['id'])->first();
                        abort_if(! $item, 404, 'Worksheet item not found');

                        $item->update($attributes);
                        $keepIds[] = $item->id;
                    } else {
                        $item = $worksheet->items()->create($attributes);
                        $keepIds[] = $item->id;
                    }
                }

                $worksheet->items()
                    ->whereNotIn('id', $keepIds)
                    ->delete();
            }
        });

        return new WorksheetResource($worksheet->fresh(['items', 'layout', 'child']));
    }

    public function destroy(Worksheet $worksheet): JsonResponse
    {
        $this->authorizeTenant($worksheet);
        $worksheet->delete();

        return response()->json(null, 204);
    }

    public function regenerateItem(WorksheetItemRegenerateRequest $request, Worksheet $worksheet, WorksheetItem $item): WorksheetItemResource
    {
        $this->authorizeTenant($worksheet);
        abort_if($item->worksheet_id !== $worksheet->id, 404, 'Worksheet item not found');

        $payload = $request->validated();

        $before = [
            'title' => $item->title,
            'instructions' => $item->instructions,
            'content_snapshot' => $item->content_snapshot,
            'can_regenerate' => $item->can_regenerate,
        ];

        DB::transaction(function () use ($payload, $item, $before) {
            $item->update([
                'title' => $payload['title'] ?? $item->title,
                'instructions' => $payload['instructions'] ?? $item->instructions,
                'content_snapshot' => $payload['content_snapshot'],
                'can_regenerate' => $payload['can_regenerate'] ?? $item->can_regenerate,
                'last_regenerated_at' => now(),
            ]);

            WorksheetItemRegeneration::create([
                'worksheet_item_id' => $item->id,
                'performed_by' => optional(auth()->user())->id,
                'status' => 'completed',
                'payload_before' => $before,
                'payload_after' => [
                    'title' => $item->title,
                    'instructions' => $item->instructions,
                    'content_snapshot' => $item->content_snapshot,
                    'can_regenerate' => $item->can_regenerate,
                ],
            ]);
        });

        return new WorksheetItemResource($item->fresh());
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exercise_ids' => ['required', 'array', 'min:1'],
            'exercise_ids.*' => ['integer', 'distinct'],
            'format' => ['sometimes', 'string', Rule::in(['A4', 'a4', 'A5', 'a5'])],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        $exerciseIds = $validated['exercise_ids'];
        $format = $validated['format'] ?? 'A4';
        $copies = $validated['copies'] ?? 1;

        try {
            $url = $this->service->generate($exerciseIds, $format, $copies);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Не удалось сформировать PDF лист.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'url' => $url,
            'format' => strtoupper($format),
            'copies' => $copies,
        ]);
    }

    public function generateAsync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exercise_ids' => ['required', 'array', 'min:1'],
            'exercise_ids.*' => ['integer', 'distinct'],
            'format' => ['sometimes', 'string', Rule::in(['A4', 'a4', 'A5', 'a5'])],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        $exerciseIds = $validated['exercise_ids'];
        $format = $validated['format'] ?? 'A4';
        $copies = $validated['copies'] ?? 1;

        Bus::dispatch(new GenerateWorksheetJob($exerciseIds, $format, $copies));

        return response()->json([
            'queued' => true,
            'format' => strtoupper($format),
            'copies' => $copies,
        ], 202);
    }

    /**
     * Generate PDF for an existing worksheet.
     */
    public function generatePdf(Worksheet $worksheet): JsonResponse
    {
        $this->authorizeTenant($worksheet);
        
        $worksheet->load('items');
        
        try {
            $url = $this->service->generateFromWorksheet($worksheet);
        } catch (Throwable $e) {
            report($e);
            
            return response()->json([
                'message' => 'Не удалось сформировать PDF лист.',
                'error' => $e->getMessage(),
            ], 422);
        }
        
        return response()->json([
            'url' => $url,
            'format' => $worksheet->format ?? 'A4',
            'copies' => $worksheet->copies ?? 1,
        ]);
    }

    private function authorizeTenant(Worksheet $worksheet): void
    {
        $user = auth()->user();

        if ($user && $user->tenant_id !== null && $worksheet->tenant_id !== $user->tenant_id) {
            abort(404, 'Worksheet not found');
        }
    }

    /**
     * Generate a share link for parent access.
     */
    public function generateShareLink(Request $request, Worksheet $worksheet): JsonResponse
    {
        $this->authorizeTenant($worksheet);
        
        $daysValid = $request->integer('days', 30);
        $daysValid = max(1, min(90, $daysValid));
        
        $token = $worksheet->generateShareToken($daysValid);
        $shareUrl = $worksheet->getShareUrl();
        
        return response()->json([
            'share_token' => $token,
            'share_url' => $shareUrl,
            'expires_at' => $worksheet->share_expires_at?->toIso8601String(),
        ]);
    }

    /**
     * Invalidate share link.
     */
    public function invalidateShareLink(Worksheet $worksheet): JsonResponse
    {
        $this->authorizeTenant($worksheet);
        $worksheet->invalidateShareToken();
        
        return response()->json(['message' => 'Ссылка для родителя деактивирована']);
    }

    /**
     * Get worksheet by share token (public access).
     */
    public function getByShareToken(string $token): WorksheetResource
    {
        $worksheet = Worksheet::where('share_token', $token)
            ->where(function ($query) {
                $query->whereNull('share_expires_at')
                    ->orWhere('share_expires_at', '>', now());
            })
            ->with(['items', 'child'])
            ->firstOrFail();
        
        return new WorksheetResource($worksheet);
    }

    /**
     * Upload completed worksheet photo (public access via token).
     */
    public function uploadCompleted(Request $request, string $token): JsonResponse
    {
        $worksheet = Worksheet::where('share_token', $token)
            ->where(function ($query) {
                $query->whereNull('share_expires_at')
                    ->orWhere('share_expires_at', '>', now());
            })
            ->firstOrFail();
        
        $validated = $request->validate([
            'photo' => ['required', 'image', 'max:10240'], // 10MB max
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        
        $path = $request->file('photo')->store('completed-worksheets', 'public');
        $url = Storage::disk('public')->url($path);
        
        // Update worksheet with completed work info
        $meta = $worksheet->meta ?? [];
        $meta['completed_at'] = now()->toIso8601String();
        $meta['completed_photo_url'] = $url;
        $meta['completion_notes'] = $validated['notes'] ?? null;
        $worksheet->update([
            'meta' => $meta,
            'status' => 'completed',
        ]);
        
        return response()->json([
            'message' => 'Работа успешно загружена!',
            'photo_url' => $url,
        ], 201);
    }
}
