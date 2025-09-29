<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;

class GenerateIllustrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'min:3', 'max:2000'],
            'seed' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'options' => ['sometimes', 'array'],
        ];
    }
}
