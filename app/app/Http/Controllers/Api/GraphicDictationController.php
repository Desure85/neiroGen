<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Generator\GraphicDictationRequest;
use App\Models\GeneratorJob;
use App\Services\Generator\GeneratorJobService;
use App\Services\Generator\GraphicDictationQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $payload = [
            'source_image' => $request->string('source_image')->toString(),
            'grid_width' => $request->integer('grid_width'),
            'grid_height' => $request->integer('grid_height'),
            'cell_size_mm' => $request->integer('cell_size_mm', 10),
            'difficulty' => $request->input('difficulty', 'medium'),
            'allow_diagonals' => (bool) $request->boolean('allow_diagonals', false),
        ];

        $config = config('generator.graphic_dictation');
        $defaultShards = (int) ($config['default_shards'] ?? 4);
        $shards = $request->integer('shards', $defaultShards);

        $job = $this->jobService->createJob('graphic_dictation', $payload, $shards, $tenantId, $userId);

        foreach ($job->shards as $shard) {
            $shardPayload = [
                'job_id' => $job->id,
                'shard_index' => $shard->shard_index,
                'shard_total' => $job->shards_total,
                'source_image' => $payload['source_image'],
                'grid_width' => $payload['grid_width'],
                'grid_height' => $payload['grid_height'],
                'cell_size_mm' => $payload['cell_size_mm'],
                'difficulty' => $payload['difficulty'],
                'allow_diagonals' => $payload['allow_diagonals'],
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
}
