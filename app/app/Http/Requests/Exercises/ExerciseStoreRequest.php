<?php

namespace App\Http\Requests\Exercises;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExerciseStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'content' => ['required', 'array'],
            'content.blocks' => ['array'],
            'content.instructions' => ['array'],
            'exercise_type_id' => ['required_without:type', 'integer', 'exists:exercise_types,id'],
            'type' => ['required_without:exercise_type_id', 'string', 'max:100', Rule::exists('exercise_types', 'key')],
            'difficulty' => ['required', 'in:easy,medium,hard'],
            'estimated_duration' => ['required', 'integer', 'min:1', 'max:240'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'instructions' => ['nullable', 'array'],
            'instructions.*' => ['string', 'max:500'],
            'custom_params' => ['nullable', 'array'],
            'blocks' => ['nullable', 'array'],
            'blocks.*.id' => ['required', 'integer', 'exists:content_blocks,id'],
            'blocks.*.order' => ['nullable', 'integer', 'min:1'],
            'blocks.*.settings' => ['nullable', 'array'],
            'blocks.*.delay' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'blocks.*.id.exists' => 'Указанный блок контента не найден.',
        ];
    }
}
