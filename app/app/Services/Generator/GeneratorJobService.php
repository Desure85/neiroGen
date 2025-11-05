<?php

namespace App\Services\Generator;

use App\Models\GeneratorJob;
use App\Models\GeneratorJobShard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class GeneratorJobService
{
    public function createJob(string $generator, array $payload, int $shardsTotal, ?int $tenantId, ?int $userId): GeneratorJob
    {
        if ($shardsTotal < 1) {
            throw new RuntimeException('Shard total must be >= 1');
        }

        return DB::transaction(function () use ($generator, $payload, $shardsTotal, $tenantId, $userId) {
            $job = GeneratorJob::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'generator' => $generator,
                'payload' => $payload,
                'status' => 'pending',
                'shards_total' => $shardsTotal,
                'shards_completed' => 0,
            ]);

            for ($index = 0; $index < $shardsTotal; $index++) {
                GeneratorJobShard::create([
                    'job_id' => $job->id,
                    'shard_index' => $index,
                    'status' => 'pending',
                ]);
            }

            return $job->fresh(['shards']);
        });
    }

    public function findJobForContext(string $jobId, ?int $tenantId, ?int $userId): ?GeneratorJob
    {
        return GeneratorJob::query()
            ->with('shards')
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->when($tenantId === null && $userId !== null, fn ($query) => $query->where('user_id', $userId))
            ->find($jobId);
    }

    public function markJobQueued(GeneratorJob $job): void
    {
        $job->update(['status' => 'queued']);
    }

    public function setShardPayload(string $jobId, int $shardIndex, array $payload): void
    {
        GeneratorJobShard::query()
            ->where('job_id', $jobId)
            ->where('shard_index', $shardIndex)
            ->update([
                'payload' => $payload,
            ]);
    }

    public function getShard(string $jobId, int $shardIndex): ?GeneratorJobShard
    {
        return GeneratorJobShard::query()
            ->where('job_id', $jobId)
            ->where('shard_index', $shardIndex)
            ->first();
    }

    public function markShardInProgress(GeneratorJobShard $shard): void
    {
        $shard->update([
            'status' => 'processing',
            'started_at' => now(),
        ]);
    }

    public function completeShard(GeneratorJobShard $shard, array $result): void
    {
        $jobId = $shard->job_id;
        $needsAggregation = false;

        DB::transaction(function () use ($shard, $result, &$needsAggregation) {
            $shard->update([
                'status' => 'completed',
                'result_payload' => $result,
                'finished_at' => now(),
            ]);

            $job = $shard->job()->lockForUpdate()->first();

            if (! $job) {
                Log::warning('GeneratorJob not found while completing shard', ['job_id' => $shard->job_id]);

                return;
            }

            $job->increment('shards_completed');

            if ($job->shards_completed >= $job->shards_total) {
                $job->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);
                $needsAggregation = true;
            } else {
                $job->update(['status' => 'processing']);
            }
        });

        if ($needsAggregation) {
            $job = GeneratorJob::with('shards')->find($jobId);
            if ($job) {
                $this->aggregateJobResult($job);
            }
        }
    }

    public function failShard(GeneratorJobShard $shard, string $error): void
    {
        DB::transaction(function () use ($shard, $error) {
            $shard->update([
                'status' => 'failed',
                'error' => $error,
                'finished_at' => now(),
            ]);

            $job = $shard->job()->lockForUpdate()->first();
            if (! $job) {
                Log::warning('GeneratorJob not found while failing shard', ['job_id' => $shard->job_id]);

                return;
            }

            $job->update([
                'status' => 'failed',
                'error' => $error,
            ]);
        });
    }

    public function aggregateJobResult(GeneratorJob $job): array
    {
        $shards = $job->shards()->orderBy('shard_index')->get();

        $commands = [];
        $instructions = [];
        $previewUrl = null;
        $previewSvgUrl = null;
        $startRow = null;
        $startCol = null;

        foreach ($shards as $shard) {
            $payload = $shard->result_payload ?? [];

            if (! empty($payload['commands']) && is_array($payload['commands'])) {
                $commands = array_merge($commands, $payload['commands']);
            }

            if (! empty($payload['preview_image_url']) && $previewUrl === null) {
                $previewUrl = $payload['preview_image_url'];
            }

            if (! empty($payload['preview_svg_url']) && $previewSvgUrl === null) {
                $previewSvgUrl = $payload['preview_svg_url'];
            }

            if (! empty($payload['instructions']) && is_array($payload['instructions'])) {
                $instructions = array_merge($instructions, $payload['instructions']);
            }

            if ($startRow === null && isset($payload['start_row']) && is_numeric($payload['start_row'])) {
                $startRow = (int) $payload['start_row'];
            }

            if ($startCol === null && isset($payload['start_col']) && is_numeric($payload['start_col'])) {
                $startCol = (int) $payload['start_col'];
            }
        }

        $result = [
            'commands' => $commands,
            'preview_image_url' => $previewUrl,
            'preview_svg_url' => $previewSvgUrl,
            'instructions' => $instructions,
            'start_row' => $startRow,
            'start_col' => $startCol,
        ];

        $job->update([
            'result_payload' => $result,
        ]);

        return $result;
    }
}
