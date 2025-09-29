<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class WorksheetItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'exercise_id' => $this->exercise_id,
            'position' => $this->position,
            'title' => $this->title,
            'instructions' => $this->instructions ?? [],
            'content_snapshot' => $this->content_snapshot,
            'can_regenerate' => $this->can_regenerate,
            'last_regenerated_at' => optional($this->last_regenerated_at)->toIso8601String(),
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
