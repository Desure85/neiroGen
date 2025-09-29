<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'child_id' => ['sometimes', 'nullable', 'integer'],
            'exercise_template_id' => ['sometimes', 'integer', 'exists:exercise_templates,id'],
            'status' => ['sometimes', 'string', 'in:pending,in_progress,completed,cancelled'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'meta' => ['sometimes', 'array'],
        ];
    }
}
