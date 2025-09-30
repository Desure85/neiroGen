<?php

namespace App\Http\Requests\Generator;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class GraphicDictationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $config = config('generator.graphic_dictation');
        $maxShards = (int) ($config['max_shards'] ?? 16);

        return [
            'description' => ['nullable', 'string', 'max:500'],
            'shape_name' => ['nullable', 'string', 'max:100'],
            'source_image' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || $value === '') {
                        return;
                    }

                    if (Str::startsWith($value, 'data:')) {
                        $commaPos = strpos($value, ',');
                        if ($commaPos === false) {
                            $fail(__('validation.invalid', ['attribute' => $attribute]));
                            return;
                        }

                        $base64 = substr($value, $commaPos + 1);
                        if ($base64 === '') {
                            $fail(__('validation.required', ['attribute' => $attribute]));
                            return;
                        }

                        if (base64_decode($base64, true) === false) {
                            $fail(__('validation.base64', ['attribute' => $attribute]));
                            return;
                        }

                        $approxBytes = (int) (strlen($base64) * 3 / 4);
                        if ($approxBytes > 50 * 1024 * 1024) {
                            $fail(__('validation.max.file', ['attribute' => $attribute, 'max' => 50]));
                        }

                        return;
                    }

                    if (strlen($value) > 1024) {
                        $fail(__('validation.max.string', ['attribute' => $attribute, 'max' => 1024]));
                    }
                },
            ],
            'grid_width' => ['required', 'integer', 'min:4', 'max:64'],
            'grid_height' => ['required', 'integer', 'min:4', 'max:64'],
            'cell_size_mm' => ['nullable', 'integer', 'min:5', 'max:20'],
            'difficulty' => ['nullable', 'string', 'in:easy,medium,hard'],
            'allow_diagonals' => ['sometimes', 'boolean'],
            'include_holes' => ['sometimes', 'boolean'],
            'shards' => ['nullable', 'integer', 'min:1', 'max:' . $maxShards],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $description = $this->input('description');
            $shapeName = $this->input('shape_name');
            $sourceImage = $this->input('source_image');
            
            // Требуем хотя бы одно из полей: description, shape_name или source_image
            if (empty($description) && empty($shapeName) && empty($sourceImage)) {
                $validator->errors()->add(
                    'description', 
                    'Укажите описание фигуры, имя фигуры или загрузите изображение'
                );
            }
        });
    }
}
