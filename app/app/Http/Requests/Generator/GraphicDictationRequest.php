<?php

namespace App\Http\Requests\Generator;

use Illuminate\Foundation\Http\FormRequest;

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
            'source_image' => ['required', 'string', 'max:1024'],
            'grid_width' => ['required', 'integer', 'min:4', 'max:64'],
            'grid_height' => ['required', 'integer', 'min:4', 'max:64'],
            'cell_size_mm' => ['nullable', 'integer', 'min:5', 'max:20'],
            'difficulty' => ['nullable', 'string', 'in:easy,medium,hard'],
            'allow_diagonals' => ['sometimes', 'boolean'],
            'shards' => ['nullable', 'integer', 'min:1', 'max:' . $maxShards],
        ];
    }
}
