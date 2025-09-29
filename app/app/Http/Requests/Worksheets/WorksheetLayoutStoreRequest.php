<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetLayoutStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'header_html' => ['nullable', 'string'],
            'footer_html' => ['nullable', 'string'],
            'meta' => ['sometimes', 'array'],
        ];
    }
}
