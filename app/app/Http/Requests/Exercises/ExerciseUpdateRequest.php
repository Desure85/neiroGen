<?php

namespace App\Http\Requests\Exercises;

use Illuminate\Foundation\Http\FormRequest;

class ExerciseUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'content' => ['sometimes', 'array'],
            'content.blocks' => ['sometimes', 'array'],
            'content.instructions' => ['sometimes', 'array'],
            'type' => ['sometimes', 'string', 'max:100'],
            'difficulty' => ['sometimes', 'in:easy,medium,hard'],
            'estimated_duration' => ['sometimes', 'integer', 'min:1', 'max:240'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'instructions' => ['sometimes', 'nullable', 'array'],
            'instructions.*' => ['string', 'max:500'],
            'custom_params' => ['sometimes', 'nullable', 'array'],
            'blocks' => ['sometimes', 'array'],
            'blocks.*.id' => ['required_with:blocks', 'integer', 'exists:content_blocks,id'],
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
