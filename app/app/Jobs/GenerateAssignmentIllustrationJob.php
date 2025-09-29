<?php

namespace App\Jobs;

use App\Models\Assignment;
use App\Services\ComfyUiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateAssignmentIllustrationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $assignmentId;
    /** @var array<string,mixed> */
    public array $payload;

    /**
     * @param array<string,mixed> $payload
     */
    public function __construct(int $assignmentId, array $payload)
    {
        $this->assignmentId = $assignmentId;
        $this->payload = $payload;
        $this->onQueue('default');
    }

    public function handle(ComfyUiService $comfy): void
    {
        $result = $comfy->requestGeneration($this->payload);

        $assignment = Assignment::find($this->assignmentId);
        if (!$assignment) {
            return;
        }
        $meta = $assignment->meta ?? [];
        $meta['comfyui'] = $meta['comfyui'] ?? [];
        $meta['comfyui']['last_request'] = $this->payload;
        $meta['comfyui']['last_result'] = $result;
        $assignment->meta = $meta;
        $assignment->save();
    }
}
