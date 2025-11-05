<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateBatchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // TODO: Добавить авторизацию
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'count' => 'required|integer|min:1|max:20',
            'types' => 'required|array|min:1|max:5',
            'types.*' => 'string|in:pronunciation,articulation,rhythm,memory,other',
            'difficulties' => 'required|array|min:1|max:3',
            'difficulties.*' => 'string|in:easy,medium,hard',
            'custom_params' => 'nullable|array',
            'custom_params.interactive' => 'boolean',
            'custom_params.audio_guidance' => 'boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'count.required' => 'Количество упражнений обязательно',
            'count.integer' => 'Количество должно быть числом',
            'count.min' => 'Количество не может быть меньше 1',
            'count.max' => 'Количество не может быть больше 20',
            'types.required' => 'Типы упражнений обязательны',
            'types.array' => 'Типы должны быть массивом',
            'types.min' => 'Должен быть указан хотя бы один тип',
            'types.max' => 'Максимум 5 типов упражнений',
            'types.*.in' => 'Недопустимый тип упражнения',
            'difficulties.required' => 'Сложности упражнений обязательны',
            'difficulties.array' => 'Сложности должны быть массивом',
            'difficulties.min' => 'Должена быть указана хотя бы одна сложность',
            'difficulties.max' => 'Максимум 3 уровня сложности',
            'difficulties.*.in' => 'Недопустимая сложность упражнения',
        ];
    }
}
