<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateExerciseRequest extends FormRequest
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
            'type' => 'required|string|in:pronunciation,articulation,rhythm,memory,other',
            'difficulty' => 'required|string|in:easy,medium,hard',
            'custom_params' => 'nullable|array',
            'custom_params.interactive' => 'boolean',
            'custom_params.audio_guidance' => 'boolean',
            'custom_params.display_time' => 'integer|min:1|max:30'
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Тип упражнения обязателен',
            'type.in' => 'Недопустимый тип упражнения',
            'difficulty.required' => 'Сложность упражнения обязательна',
            'difficulty.in' => 'Недопустимая сложность упражнения',
            'custom_params.array' => 'Дополнительные параметры должны быть массивом',
            'custom_params.interactive.boolean' => 'Параметр interactive должен быть логическим значением',
            'custom_params.audio_guidance.boolean' => 'Параметр audio_guidance должен быть логическим значением',
            'custom_params.display_time.integer' => 'Время отображения должно быть числом',
            'custom_params.display_time.min' => 'Время отображения не может быть меньше 1 секунды',
            'custom_params.display_time.max' => 'Время отображения не может быть больше 30 секунд'
        ];
    }
}
