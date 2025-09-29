<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetLayoutUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'header_html' => ['sometimes', 'nullable', 'string'],
            'footer_html' => ['sometimes', 'nullable', 'string'],
            'meta' => ['sometimes', 'array'],
        ];
    }
}
