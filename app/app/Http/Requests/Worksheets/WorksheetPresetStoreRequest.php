<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetPresetStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.key' => ['required', 'string', 'max:64'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.value' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
