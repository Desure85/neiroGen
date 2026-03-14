<?php

namespace App\Http\Requests\Worksheets;

use Illuminate\Foundation\Http\FormRequest;

class WorksheetUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:draft,ready,archived'],
            'format' => ['sometimes', 'string', 'in:A4,a4,A5,a5'],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'worksheet_layout_id' => ['sometimes', 'nullable', 'integer', 'exists:worksheet_layouts,id'],
            'header_html' => ['sometimes', 'nullable', 'string'],
            'footer_html' => ['sometimes', 'nullable', 'string'],
            'fields_snapshot' => ['sometimes', 'array'],
            'fields_snapshot.*' => ['array'],
            'meta' => ['sometimes', 'array'],
            'child_id' => ['sometimes', 'nullable', 'integer', 'exists:children,id'],

            'items' => ['sometimes', 'array'],
            'items.*.id' => ['nullable', 'integer', 'exists:worksheet_items,id'],
            'items.*.exercise_id' => ['nullable', 'integer', 'exists:exercises,id'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.instructions' => ['nullable', 'array'],
            'items.*.instructions.*' => ['nullable', 'string', 'max:2000'],
            'items.*.content_snapshot' => ['required_with:items', 'array'],
            'items.*.can_regenerate' => ['sometimes', 'boolean'],
        ];
    }
}
