<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ExerciseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'difficulty' => $this->difficulty,
            'estimated_duration' => $this->estimated_duration,
            'tags' => $this->tags ?? [],
            'is_active' => $this->is_active,
            'instructions' => $this->instructions ?? $this->content['instructions'] ?? [],
            'custom_params' => $this->custom_params ?? $this->content['custom_params'] ?? [],
            'content' => $this->content,
            'blocks' => $this->whenLoaded('contentBlocks', function () {
                return $this->contentBlocks->map(function ($block) {
                    return [
                        'id' => $block->id,
                        'type' => $block->type,
                        'title' => $block->title,
                        'order' => $block->pivot->order,
                        'delay' => $block->pivot->delay,
                        'settings' => $block->pivot->settings ?? [],
                        'display_content' => $block->display_content,
                    ];
                });
            }),
            'created_by' => $this->created_by,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
