<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'child_id' => ['nullable', 'integer'],
            'exercise_template_id' => ['required', 'integer', 'exists:exercise_templates,id'],
            'status' => ['sometimes', 'string', 'in:pending,in_progress,completed,cancelled'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'meta' => ['sometimes', 'array'],
            'tenant_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
