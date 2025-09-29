<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetItemRegenerateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'instructions' => ['sometimes', 'array'],
            'instructions.*' => ['string', 'max:500'],
            'content_snapshot' => ['required', 'array'],
            'can_regenerate' => ['sometimes', 'boolean'],
        ];
    }
}
