<?php

namespace App\Http\Resources\Admin\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExerciseTypeResource extends JsonResource
{
    /**
     * @param  Request  $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'domain' => $this->domain,
            'icon' => $this->icon,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'display_order' => $this->display_order,
            'meta' => $this->meta,
            'fields' => ExerciseTypeFieldResource::collection($this->whenLoaded('fields')),
            'fields_count' => $this->when(isset($this->fields_count), (int) $this->fields_count),
            'exercises_count' => $this->when(isset($this->exercises_count), (int) $this->exercises_count),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
