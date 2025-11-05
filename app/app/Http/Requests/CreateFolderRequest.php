<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateFolderRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|uuid|exists:files,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Название папки обязательно',
            'name.max' => 'Название папки не может быть длиннее 255 символов',
            'parent_id.uuid' => 'Некорректный ID родительской папки',
            'parent_id.exists' => 'Родительская папка не найдена',
        ];
    }
}
