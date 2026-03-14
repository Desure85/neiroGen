<?php

namespace App\Factories;

use App\Models\ContentBlock;
use App\Models\Exercise;

class ExerciseContentFactory
{
    public function createContentBlocksFromExercise(Exercise $exercise, int $userId): array
    {
        $contentBlocks = [];
        $order = 0;

        // Создаем ContentBlock для каждого элемента упражнения
        foreach ($exercise->content['items'] as $item) {
            $contentBlock = $this->createContentBlockForItem(
                $exercise->content['exercise_type'],
                $item,
                $exercise->type,
                $order++,
                $userId
            );

            if ($contentBlock) {
                $contentBlocks[] = $contentBlock;
            }
        }

        return $contentBlocks;
    }

    private function createContentBlockForItem(string $exerciseType, string $item, string $type, int $order, int $userId): ?ContentBlock
    {
        $blockType = $this->determineBlockType($exerciseType);
        $content = $this->formatContentForBlock($exerciseType, $item, $type);

        if (! $content) {
            return null;
        }

        return ContentBlock::create([
            'type' => $blockType,
            'title' => $this->generateBlockTitle($exerciseType, $item),
            'content' => $content,
            'metadata' => [
                'exercise_type' => $exerciseType,
                'source_item' => $item,
                'order' => $order,
            ],
            'settings' => [
                'display_mode' => 'sequential',
                'auto_play' => $exerciseType === 'pronunciation',
                'show_progress' => true,
            ],
            'is_template' => false,
            'created_by' => $userId,
        ]);
    }

    private function determineBlockType(string $exerciseType): string
    {
        return match ($exerciseType) {
            'pronunciation', 'articulation' => 'interactive',
            'rhythm' => 'audio',
            'memory' => 'choice',
            default => 'text'
        };
    }

    private function formatContentForBlock(string $exerciseType, string $item, string $type): ?array
    {
        return match ($exerciseType) {
            'pronunciation' => [
                'interactive_type' => 'listen_repeat',
                'text' => $item,
                'audio_url' => null, // TODO: Генерировать TTS
                'instructions' => ['Повторите вслух'],
            ],
            'articulation' => [
                'interactive_type' => 'sound_practice',
                'text' => $item,
                'target_sound' => $this->extractSound($item),
                'instructions' => ['Произносите четко'],
            ],
            'rhythm' => [
                'url' => null,
                'pattern' => $item,
                'tempo' => 'medium',
                'instructions' => ['Повторите ритм'],
            ],
            'memory' => [
                'question' => 'Запомните последовательность',
                'options' => [$item],
                'correct_answer' => 0,
                'instructions' => ['Выберите правильный вариант'],
            ],
            default => [
                'text' => $item,
                'instructions' => ['Выполните задание'],
            ]
        };
    }

    private function generateBlockTitle(string $exerciseType, string $item): string
    {
        return match ($exerciseType) {
            'pronunciation' => "Произношение: {$item}",
            'articulation' => "Артикуляция: {$item}",
            'rhythm' => "Ритм: {$item}",
            'memory' => "Память: {$item}",
            default => "Элемент: {$item}"
        };
    }

    private function extractSound(string $item): string
    {
        // Извлекаем звук из формата "Звук: р"
        if (preg_match('/Звук:\s*([а-яё]+)/iu', $item, $matches)) {
            return $matches[1];
        }

        return '';
    }
}
