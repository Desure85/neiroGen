<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ContentBlock extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'title',
        'content',
        'metadata',
        'settings',
        'is_template',
        'created_by',
        'tenant_id',
    ];

    protected $casts = [
        'content' => 'array',
        'metadata' => 'array',
        'settings' => 'array',
        'is_template' => 'boolean',
        'tenant_id' => 'integer',
    ];

    const TYPES = [
        'text' => 'Текст',
        'image' => 'Изображение',
        'audio' => 'Аудио',
        'video' => 'Видео',
        'interactive' => 'Интерактивный элемент',
        'drawing' => 'Рисование',
        'choice' => 'Выбор ответа',
        'sequence' => 'Последовательность',
    ];

    const INTERACTIVE_TYPES = [
        'listen_repeat' => 'Слушай и повторяй',
        'sound_recognition' => 'Распознавание звуков',
        'word_completion' => 'Дополни слово',
        'sentence_building' => 'Составь предложение',
        'rhythm_tapping' => 'Ритмичное постукивание',
        'memory_cards' => 'Карточки памяти',
        'phoneme_discrimination' => 'Различение фонем',
    ];

    public function exercises(): BelongsToMany
    {
        return $this->belongsToMany(Exercise::class, 'exercise_blocks')
            ->withPivot('order', 'settings', 'delay')
            ->withTimestamps()
            ->orderBy('exercise_blocks.order');
    }

    public function getUsageMetadataAttribute(): array
    {
        $exercises = $this->exercises()->get();

        return [
            'total_usage' => $exercises->count(),
            'exercises_by_difficulty' => $exercises
                ->groupBy('difficulty')
                ->map->count(),
            'average_order' => $exercises
                ->avg(fn ($exercise) => $exercise->pivot->order ?? 0) ?? 0,
            'last_used' => $this->exercises()
                ->orderByDesc('exercise_blocks.updated_at')
                ->value('exercise_blocks.updated_at'),
        ];
    }

    public function getDisplayContentAttribute()
    {
        return match ($this->type) {
            'text' => $this->content['text'] ?? '',
            'image' => $this->content['url'] ?? $this->content['path'] ?? '',
            'audio' => $this->content['url'] ?? $this->content['path'] ?? '',
            'video' => $this->content['url'] ?? $this->content['path'] ?? '',
            'interactive' => $this->getInteractiveDisplay($this->content),
            'drawing' => '🖌️ Рисование',
            'choice' => $this->formatChoiceDisplay($this->content),
            'sequence' => $this->formatSequenceDisplay($this->content),
            default => 'Неизвестный тип блока'
        };
    }

    private function getInteractiveDisplay($content)
    {
        return match ($content['interactive_type'] ?? '') {
            'listen_repeat' => '🔊 Слушай и повторяй',
            'sound_recognition' => '🎯 Распознай звук',
            'word_completion' => '📝 Дополни слово',
            'sentence_building' => '🔤 Составь предложение',
            'rhythm_tapping' => '👆 Ритмичное постукивание',
            'memory_cards' => '🧠 Карточки памяти',
            'phoneme_discrimination' => '👂 Различение звуков',
            default => '🎮 Интерактивное упражнение'
        };
    }

    private function formatChoiceDisplay($content)
    {
        $question = $content['question'] ?? '';
        $options = $content['options'] ?? [];
        $optionCount = count($options);

        return "{$question} (Вариантов: {$optionCount})";
    }

    private function formatSequenceDisplay($content)
    {
        $items = $content['items'] ?? [];
        $itemCount = count($items);

        return "Последовательность ({$itemCount} элементов)";
    }
}
