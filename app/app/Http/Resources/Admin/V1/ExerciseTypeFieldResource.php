<?php

namespace App\Http\Resources\Admin\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExerciseTypeFieldResource extends JsonResource
{
    /**
     * @param  Request  $request
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'exercise_type_id' => $this->exercise_type_id,
            'key' => $this->key,
            'label' => $this->label,
            'field_type' => $this->field_type,
            'is_required' => (bool) $this->is_required,
            'min_value' => $this->min_value,
            'max_value' => $this->max_value,
            'step' => $this->step,
            'default_value' => $this->default_value,
            'options' => $this->options,
            'help_text' => $this->help_text,
            'display_order' => $this->display_order,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
