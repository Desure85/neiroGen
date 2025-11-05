<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadFileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'files' => 'required|array',
            'files.*' => 'file|max:10240', // 10MB max per file
            'parent_id' => 'nullable|uuid|exists:files,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'files.required' => 'Файлы обязательны',
            'files.array' => 'Файлы должны быть массивом',
            'files.*.file' => 'Каждый элемент должен быть файлом',
            'files.*.max' => 'Размер файла не должен превышать 10MB',
            'parent_id.uuid' => 'Некорректный ID папки',
            'parent_id.exists' => 'Папка не найдена',
        ];
    }
}
