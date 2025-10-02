<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExerciseTypeFieldRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $exerciseType = $this->route('exerciseType');

        return [
            'label' => ['required', 'string', 'max:255'],
            'key' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('exercise_type_fields', 'key')->where('exercise_type_id', $exerciseType?->id),
            ],
            'field_type' => ['required', 'string', Rule::in([
                'string',
                'text',
                'integer',
                'number',
                'boolean',
                'enum',
                'array_enum',
                'json',
            ])],
            'is_required' => ['sometimes', 'boolean'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric'],
            'step' => ['nullable', 'numeric'],
            'default_value' => ['nullable'],
            'options' => ['nullable', 'array'],
            'help_text' => ['nullable', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('key')) {
            $this->merge([
                'key' => str($this->input('key'))->lower()->replace(' ', '_')->value(),
            ]);
        }

        if ($this->has('is_required')) {
            $this->merge([
                'is_required' => filter_var($this->input('is_required'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            ]);
        }

        foreach (['min_value', 'max_value', 'step'] as $numeric) {
            if ($this->filled($numeric)) {
                $this->merge([
                    $numeric => is_numeric($this->input($numeric)) ? (float) $this->input($numeric) : null,
                ]);
            }
        }

        if ($this->filled('default_value') && is_string($this->input('default_value'))) {
            $decoded = json_decode($this->input('default_value'), true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge(['default_value' => $decoded]);
            }
        }

        if ($this->filled('options') && is_string($this->input('options'))) {
            $decoded = json_decode($this->input('options'), true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->merge(['options' => $decoded]);
            }
        }
    }
}
