<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExerciseType extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'domain',
        'icon',
        'description',
        'is_active',
        'display_order',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'meta' => 'json',
    ];

    public function fields(): HasMany
    {
        return $this->hasMany(ExerciseTypeField::class);
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(Exercise::class);
    }

    /**
     * Get AI prompts from meta
     */
    public function getPrompts(): array
    {
        return $this->meta['prompts'] ?? [
            'instructions' => '',
            'content' => '',
            'solution' => '',
            'variations' => '',
        ];
    }

    /**
     * Set AI prompts in meta
     */
    public function setPrompts(array $prompts): void
    {
        $meta = $this->meta ?? [];
        $meta['prompts'] = $prompts;
        $this->meta = $meta;
    }

    /**
     * Get a specific prompt
     */
    public function getPrompt(string $type): string
    {
        $prompts = $this->getPrompts();
        return $prompts[$type] ?? '';
    }

    /**
     * Check if prompts are configured
     */
    public function hasPrompts(): bool
    {
        $prompts = $this->getPrompts();
        return !empty($prompts['content']);
    }

    /**
     * Render prompt with variables
     */
    public function renderPrompt(string $type, array $variables = []): string
    {
        $prompt = $this->getPrompt($type);
        
        foreach ($variables as $key => $value) {
            $prompt = str_replace('{{' . $key . '}}', $value, $prompt);
        }
        
        return $prompt;
    }

    /**
     * Get available prompt types
     */
    public static function getPromptTypes(): array
    {
        return [
            'instructions' => [
                'name' => 'Инструкция',
                'description' => 'Инструкция, которую видит ребёнок',
                'placeholder' => 'Например: "Посмотри на картинки и запомни их порядок"',
            ],
            'content' => [
                'name' => 'Генерация контента',
                'description' => 'Промпт для генерации основного контента упражнения',
                'placeholder' => 'Например: "Сгенерируй {{count}} изображений для игры на память на тему {{topic}}"',
            ],
            'solution' => [
                'name' => 'Правильные ответы',
                'description' => 'Промпт для генерации ответов/решений',
                'placeholder' => 'Например: 'Последовательность: {{content}}'',
            ],
            'variations' => [
                'name' => 'Вариации',
                'description' => 'Промпт для генерации вариаций упражнения',
                'placeholder' => 'Например: 'Создай вариацию для уровня сложности {{difficulty}}'',
            ],
        ];
    }

    /**
     * Get delivery types (printable, online, hybrid)
     */
    public function getDeliveryTypes(): array
    {
        return $this->meta['delivery_types'] ?? ['online']; // Default to online only
    }

    /**
     * Set delivery types
     */
    public function setDeliveryTypes(array $types): void
    {
        $meta = $this->meta ?? [];
        $meta['delivery_types'] = $types;
        $this->meta = $meta;
    }

    /**
     * Check if exercise type supports printable mode
     */
    public function supportsPrintable(): bool
    {
        return in_array('printable', $this->getDeliveryTypes());
    }

    /**
     * Check if exercise type supports online mode
     */
    public function supportsOnline(): bool
    {
        return in_array('online', $this->getDeliveryTypes());
    }

    /**
     * Check if exercise type supports both modes
     */
    public function isHybrid(): bool
    {
        $types = $this->getDeliveryTypes();
        return in_array('printable', $types) && in_array('online', $types);
    }

    /**
     * Get available delivery type options
     */
    public static function getDeliveryTypeOptions(): array
    {
        return [
            'online' => [
                'name' => 'Онлайн',
                'description' => 'Интерактивное выполнение в приложении',
                'icon' => '💻',
            ],
            'printable' => [
                'name' => 'Печать',
                'description' => 'Распечатка и выполнение на бумаге',
                'icon' => '🖨️',
            ],
        ];
    }
}
