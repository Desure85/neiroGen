<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExerciseTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $exerciseTypeId = $this->route('exerciseType')?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'key' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('exercise_types', 'key')->ignore($exerciseTypeId),
            ],
            'domain' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'meta' => ['nullable', 'array'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('key')) {
            $this->merge([
                'key' => str($this->input('key'))->lower()->replace(' ', '_')->value(),
            ]);
        }

        if ($this->filled('domain')) {
            $this->merge([
                'domain' => str($this->input('domain'))->lower()->trim()->value(),
            ]);
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }

        if ($this->filled('meta') && is_string($this->input('meta'))) {
            $decoded = json_decode($this->input('meta'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge(['meta' => $decoded]);
            }
        }
    }
}
