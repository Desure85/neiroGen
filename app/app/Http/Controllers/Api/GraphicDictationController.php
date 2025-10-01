<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Generator\GraphicDictationRequest;
use App\Models\GeneratorJob;
use App\Services\Generator\GeneratorJobService;
use App\Services\Generator\GraphicDictationQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class GraphicDictationController extends Controller
{
    public function __construct(
        private readonly GeneratorJobService $jobService,
        private readonly GraphicDictationQueueService $queueService,
    ) {
    }

    public function store(GraphicDictationRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $userId = $user?->id;

        // Store source image only if provided
        $storedImage = null;
        if ($request->filled('source_image')) {
            $storedImage = $this->storeSourceImage($request->string('source_image')->toString());
        }

        $payload = [
            'description' => $request->string('description')->toString() ?: null,
            'shape_name' => $request->string('shape_name')->toString() ?: null,
            'source_image' => $storedImage['url'] ?? null,
            'source_image_object' => $storedImage['object'] ?? null,
            'grid_width' => $request->integer('grid_width'),
            'grid_height' => $request->integer('grid_height'),
            'cell_size_mm' => $request->integer('cell_size_mm', 10),
            'difficulty' => $request->input('difficulty', 'medium'),
            'allow_diagonals' => (bool) $request->boolean('allow_diagonals', false),
            'include_holes' => (bool) $request->boolean('include_holes', false),
            'image_invert' => (bool) $request->boolean('image_invert', false),
            'image_skeletonize' => (bool) $request->boolean('image_skeletonize', false),
            'image_single_contour' => (bool) $request->boolean('image_single_contour', false),
        ];

        $optionalFloats = [
            'image_threshold',
            'image_blur_radius',
            'simplification',
            'image_min_contour_area',
            'image_canny_low',
            'image_canny_high',
        ];

        foreach ($optionalFloats as $field) {
            $value = $request->input($field);
            if ($value !== null && $value !== '') {
                $payload[$field] = (float) $value;
            }
        }

        $optionalInts = [
            'smoothing',
            'image_max_contours',
            'image_high_res_grid',
        ];

        foreach ($optionalInts as $field) {
            $value = $request->input($field);
            if ($value !== null && $value !== '') {
                $payload[$field] = (int) $value;
            }
        }

        $config = config('generator.graphic_dictation');
        $defaultShards = (int) ($config['default_shards'] ?? 4);
        $shards = $request->integer('shards', $defaultShards);

        $job = $this->jobService->createJob('graphic_dictation', $payload, $shards, $tenantId, $userId);

        foreach ($job->shards as $shard) {
            $shardPayload = [
                'job_id' => $job->id,
                'shard_index' => $shard->shard_index,
                'shard_total' => $job->shards_total,
                'description' => $payload['description'],
                'shape_name' => $payload['shape_name'],
                'source_image' => $payload['source_image'],
                'source_image_object' => $payload['source_image_object'],
                'grid_width' => $payload['grid_width'],
                'grid_height' => $payload['grid_height'],
                'cell_size_mm' => $payload['cell_size_mm'],
                'difficulty' => $payload['difficulty'],
                'allow_diagonals' => $payload['allow_diagonals'],
                'include_holes' => $payload['include_holes'],
                'image_threshold' => $payload['image_threshold'] ?? null,
                'image_blur_radius' => $payload['image_blur_radius'] ?? null,
                'image_invert' => $payload['image_invert'],
                'simplification' => $payload['simplification'] ?? null,
                'smoothing' => $payload['smoothing'] ?? null,
                'image_min_contour_area' => $payload['image_min_contour_area'] ?? null,
                'image_max_contours' => $payload['image_max_contours'] ?? null,
                'image_high_res_grid' => $payload['image_high_res_grid'] ?? null,
                'image_canny_low' => $payload['image_canny_low'] ?? null,
                'image_canny_high' => $payload['image_canny_high'] ?? null,
                'image_skeletonize' => $payload['image_skeletonize'],
                'image_single_contour' => $payload['image_single_contour'],
            ];

            $this->jobService->setShardPayload($job->id, $shard->shard_index, $shardPayload);
            $this->queueService->publishShard($shardPayload);
        }

        $this->jobService->markJobQueued($job);

        return response()->json([
            'job_id' => $job->id,
            'status' => $job->status,
            'shards_total' => $job->shards_total,
        ], Response::HTTP_ACCEPTED);
    }

    public function show(string $job, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $userId = $user?->id;

        /** @var GeneratorJob|null $jobModel */
        $jobModel = $this->jobService->findJobForContext($job, $tenantId, $userId);

        abort_if(! $jobModel, Response::HTTP_NOT_FOUND, 'Generator job not found');

        return response()->json([
            'job_id' => $jobModel->id,
            'status' => $jobModel->status,
            'shards_total' => $jobModel->shards_total,
            'shards_completed' => $jobModel->shards_completed,
            'result' => $jobModel->result_payload,
            'error' => $jobModel->error,
            'completed_at' => optional($jobModel->completed_at)->toIso8601String(),
            'created_at' => $jobModel->created_at->toIso8601String(),
            'updated_at' => $jobModel->updated_at->toIso8601String(),
        ]);
    }

    private function storeSourceImage(string $source): array
    {
        if ($source === '') {
            throw new \RuntimeException('Источник изображения пуст');
        }

        if (Str::startsWith($source, ['http://', 'https://'])) {
            return [
                'object' => $source,
                'url' => $source,
            ];
        }

        if (Str::startsWith($source, 's3://')) {
            $path = Str::after($source, 's3://');
            [$bucket, $key] = array_pad(explode('/', $path, 2), 2, null);
            if (! $bucket || ! $key) {
                throw new \RuntimeException('Некорректный путь до объекта S3/MinIO');
            }

            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('s3');
            if (! method_exists($disk, 'temporaryUrl')) {
                throw new \RuntimeException('Диск s3 не поддерживает временные URL');
            }

            $expires = now()->addMinutes((int) env('MINIO_SIGNED_URL_TTL', 15));

            return [
                'object' => $source,
                'url' => $disk->temporaryUrl($key, $expires),
            ];
        }

        if (! Str::startsWith($source, 'data:')) {
            throw new \RuntimeException('Поддерживаются только data URL или HTTP/S ссылки');
        }

        [$meta, $encoded] = explode(',', $source, 2) + [null, null];
        if (! $meta || ! $encoded) {
            throw new \RuntimeException('Некорректный data URL');
        }

        $semicolonPos = strpos($meta, ';');
        if ($semicolonPos === false || ! Str::startsWith($meta, 'data:image/')) {
            throw new \RuntimeException('Поддерживаются только изображения');
        }

        $mime = substr($meta, 5, $semicolonPos - 5);
        $extension = match ($mime) {
            'image/png' => 'png',
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/webp' => 'webp',
            default => throw new \RuntimeException('Неподдерживаемый тип изображения: ' . $mime),
        };

        $binary = base64_decode($encoded, true);
        if ($binary === false) {
            throw new \RuntimeException('Не удалось декодировать изображение');
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('s3');
        if (! method_exists($disk, 'temporaryUrl')) {
            throw new \RuntimeException('Диск s3 не поддерживает временные URL');
        }
        $bucket = config('filesystems.disks.s3.bucket');
        if (! $bucket) {
            throw new \RuntimeException('Не настроен бакет для хранения изображений');
        }

        $objectKey = sprintf('graphic-dictation/source/%s.%s', Str::uuid(), $extension);

        if (! $disk->put($objectKey, $binary, [
            'visibility' => 'private',
            'ContentType' => $mime,
        ])) {
            throw new \RuntimeException('Не удалось загрузить изображение в хранилище');
        }

        $expires = now()->addMinutes((int) env('MINIO_SIGNED_URL_TTL', 15));

        return [
            'object' => sprintf('s3://%s/%s', $bucket, $objectKey),
            'url' => $disk->temporaryUrl($objectKey, $expires),
        ];
    }
}
