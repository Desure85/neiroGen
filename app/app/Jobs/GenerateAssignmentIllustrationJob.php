<?php

namespace App\Jobs;

use App\Models\Assignment;
use App\Services\AI\AiService;
use App\Services\AI\DTOs\AiGenerationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateAssignmentIllustrationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $assignmentId;

    /** @var array<string,mixed> */
    public array $payload;

    /**
     * @param  array<string,mixed>  $payload
     */
    public function __construct(int $assignmentId, array $payload)
    {
        $this->assignmentId = $assignmentId;
        $this->payload = $payload;
        $this->onQueue('default');
    }

    public function handle(AiService $aiService): void
    {
        $assignment = Assignment::find($this->assignmentId);
        if (!$assignment) {
            Log::warning("Assignment not found: {$this->assignmentId}");
            return;
        }

        // Extract prompt and content type from payload
        $prompt = $this->payload['prompt'] ?? $this->payload['text'] ?? '';
        $contentType = $this->payload['content_type'] ?? 'image';
        
        // Validate we have a prompt
        if (empty($prompt)) {
            Log::warning("No prompt provided for assignment: {$this->assignmentId}");
            $this->saveResult($assignment, ['ok' => false, 'error' => 'No prompt provided']);
            return;
        }

        // Create the request
        $request = match ($contentType) {
            'text' => AiGenerationRequest::forText($prompt, $this->payload['parameters'] ?? []),
            'exercise' => AiGenerationRequest::forExercise($prompt, $this->payload['parameters'] ?? []),
            default => AiGenerationRequest::forImage($prompt, $this->payload['parameters'] ?? []),
        };

        // Generate using AI service
        $result = $aiService->generate($request);

        // Save the result
        $this->saveResult($assignment, [
            'ok' => $result->isSuccess(),
            'content' => $result->content,
            'error' => $result->error,
            'provider' => $result->provider ?? 'unknown',
            'model' => $result->model ?? null,
        ]);
    }

    /**
     * @param  array<string,mixed>  $result
     */
    protected function saveResult(Assignment $assignment, array $result): void
    {
        $meta = $assignment->meta ?? [];
        $meta['ai_generation'] = $meta['ai_generation'] ?? [];
        $meta['ai_generation']['last_request'] = $this->payload;
        $meta['ai_generation']['last_result'] = $result;
        $meta['ai_generation']['generated_at'] = now()->toIso8601String();
        
        // If generation was successful, store the content
        if ($result['ok'] ?? false) {
            $meta['ai_generation']['content'] = $result['content'] ?? null;
        }
        
        $assignment->meta = $meta;
        $assignment->save();
        
        Log::info("Assignment illustration generated", [
            'assignment_id' => $this->assignmentId,
            'success' => $result['ok'] ?? false,
        ]);
    }
}
