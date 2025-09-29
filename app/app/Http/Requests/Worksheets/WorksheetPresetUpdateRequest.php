<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetPresetUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'fields' => ['sometimes', 'array', 'min:1'],
            'fields.*.key' => ['required_with:fields', 'string', 'max:64'],
            'fields.*.label' => ['required_with:fields', 'string', 'max:255'],
            'fields.*.value' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
