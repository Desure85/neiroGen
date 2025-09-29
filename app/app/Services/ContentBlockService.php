<?php

namespace App\Services;

use App\Models\ContentBlock;
use App\Models\Exercise;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ContentBlockService
{
    public function createBlock(array $data, User $creator): ContentBlock
    {
        $data['created_by'] = $creator->id;
        $data['tenant_id'] = $creator->tenant_id;
        $data['is_template'] = $data['is_template'] ?? false;

        return ContentBlock::create($this->validateBlockData($data));
    }

    public function updateBlock(ContentBlock $block, array $data): ContentBlock
    {
        unset($data['tenant_id'], $data['created_by']);

        $block->update($this->validateBlockData(array_merge(
            ['type' => $block->type],
            $data,
            ['tenant_id' => $block->tenant_id, 'created_by' => $block->created_by]
        )));

        return tap($block)->refresh();
    }

    public function deleteBlock(ContentBlock $block): bool
    {
        // Проверяем, используется ли блок в упражнениях
        if ($block->exercises()->exists()) {
            throw new \Exception('Нельзя удалить блок, который используется в упражнениях');
        }

        return $block->delete();
    }

    public function getBlocksByType(string $type, ?User $user = null): Collection
    {
        $query = ContentBlock::byType($type);

        if ($user) {
            $query->where('created_by', $user->id);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getTemplateBlocks(string $type = null, ?User $user = null): Collection
    {
        $query = ContentBlock::templates();

        if ($type) {
            $query->byType($type);
        }

        if ($user) {
            $query->where('tenant_id', $user->tenant_id);
        }

        return $query->orderBy('type')->orderBy('title')->get();
    }

    public function createExerciseFromBlocks(array $blockIds, array $exerciseData = []): Exercise
    {
        $blocks = ContentBlock::whereIn('id', $blockIds)->orderBy('id')->get();

        if ($blocks->count() !== count($blockIds)) {
            throw new \Exception('Один или несколько блоков не найдены');
        }

        $exercise = Exercise::create(array_merge([
            'title' => $exerciseData['title'] ?? 'Новое упражнение',
            'description' => $exerciseData['description'] ?? 'Составное упражнение',
            'type' => $exerciseData['type'] ?? 'custom',
            'difficulty' => $exerciseData['difficulty'] ?? 'medium',
            'estimated_duration' => $exerciseData['estimated_duration'] ?? 15,
            'tags' => $exerciseData['tags'] ?? ['custom'],
            'is_active' => true
        ], $exerciseData));

        // Добавляем блоки к упражнению
        foreach ($blocks as $index => $block) {
            $exercise->addContentBlock($block, [
                'order' => $index + 1,
                'delay' => $exerciseData['delays'][$block->id] ?? 0
            ]);
        }

        return $exercise;
    }

    public function duplicateBlock(ContentBlock $block, User $newCreator): ContentBlock
    {
        return ContentBlock::create([
            'type' => $block->type,
            'title' => $block->title . ' (копия)',
            'content' => $block->content,
            'metadata' => $block->metadata,
            'settings' => $block->settings,
            'is_template' => false,
            'created_by' => $newCreator->id,
            'tenant_id' => $newCreator->tenant_id,
        ]);
    }

    public function getBlockAnalytics(ContentBlock $block)
    {
        return [
            'total_usage' => $block->exercises()->count(),
            'exercises_by_difficulty' => $block->exercises()
                ->get()
                ->groupBy('difficulty')
                ->map->count(),
            'average_order' => $block->exercises()
                ->get()
                ->avg('pivot_order') ?? 0,
            'last_used' => $block->exercises()
                ->latest('pivot_updated_at')
                ->first()?->pivot_updated_at
        ];
    }

    private function validateBlockData(array $data): array
    {
        $rules = [
            'text' => ['title', 'content.text'],
            'image' => ['title', 'content.url'],
            'audio' => ['title', 'content.url'],
            'video' => ['title', 'content.url'],
            'interactive' => ['title', 'content.interactive_type', 'content.data'],
            'drawing' => ['title', 'content.instructions'],
            'choice' => ['title', 'content.question', 'content.options'],
            'sequence' => ['title', 'content.items']
        ];

        $requiredFields = $rules[$data['type']] ?? ['title'];

        foreach ($requiredFields as $field) {
            $keys = explode('.', $field);
            $value = $data;

            foreach ($keys as $key) {
                if (!isset($value[$key])) {
                    throw new \Exception("Поле {$field} обязательно для типа {$data['type']}");
                }
                $value = $value[$key];
            }
        }

        return $data;
    }

    public function exportBlock(ContentBlock $block): array
    {
        return [
            'id' => $block->id,
            'type' => $block->type,
            'title' => $block->title,
            'content' => $this->prepareContentForExport($block),
            'metadata' => $block->metadata,
            'settings' => $block->settings,
            'exported_at' => now()->toISOString()
        ];
    }

    public function importBlock(array $data, User $creator): ContentBlock
    {
        return ContentBlock::create([
            'type' => $data['type'],
            'title' => $data['title'],
            'content' => $this->prepareContentForImport($data['content']),
            'metadata' => $data['metadata'] ?? [],
            'settings' => $data['settings'] ?? [],
            'is_template' => false,
            'created_by' => $creator->id,
            'tenant_id' => $creator->tenant_id,
        ]);
    }

    private function prepareContentForExport(ContentBlock $block): array
    {
        $content = $block->content;

        // Для файловых блоков добавляем метаданные
        if (in_array($block->type, ['image', 'audio', 'video'])) {
            if (isset($content['path']) && Storage::exists($content['path'])) {
                $content['file_info'] = [
                    'size' => Storage::size($content['path']),
                    'mime_type' => Storage::mimeType($content['path']),
                    'last_modified' => Storage::lastModified($content['path'])
                ];
            }
        }

        return $content;
    }

    private function prepareContentForImport(array $content): array
    {
        // Убираем экспортные метаданные
        unset($content['file_info']);
        return $content;
    }

    public function searchBlocks(string $query, ?string $type = null, ?User $user = null): Collection
    {
        $queryBuilder = ContentBlock::query();

        if ($type) {
            $queryBuilder->byType($type);
        }

        if ($user) {
            $queryBuilder->where('created_by', $user->id)
                ->where('tenant_id', $user->tenant_id);
        }

        return $queryBuilder->where(function($q) use ($query) {
            $q->where('title', 'like', "%{$query}%")
              ->orWhere('content', 'like', "%{$query}%");
        })->orderBy('title')->get();
    }

    public function getPopularBlocks(int $limit = 10): Collection
    {
        return ContentBlock::withCount('exercises')
            ->orderBy('exercises_count', 'desc')
            ->limit($limit)
            ->get();
    }

    public function validateBlockForExercise(ContentBlock $block, Exercise $exercise): array
    {
        $errors = [];

        // Проверка типа блока
        if (!$this->isBlockCompatibleWithExercise($block, $exercise)) {
            $errors[] = "Блок типа {$block->type} не совместим с упражнением типа {$exercise->type}";
        }

        // Проверка настроек
        if ($block->type === 'interactive' && !isset($block->content['interactive_type'])) {
            $errors[] = 'Интерактивный блок должен иметь тип взаимодействия';
        }

        return $errors;
    }

    private function isBlockCompatibleWithExercise(ContentBlock $block, Exercise $exercise): bool
    {
        $compatibilityMatrix = [
            'pronunciation' => ['text', 'audio', 'interactive'],
            'articulation' => ['text', 'audio', 'interactive'],
            'rhythm' => ['text', 'audio', 'interactive'],
            'memory' => ['text', 'image', 'sequence', 'interactive'],
            'custom' => ['text', 'image', 'audio', 'video', 'interactive', 'drawing', 'choice', 'sequence']
        ];

        $allowedTypes = $compatibilityMatrix[$exercise->type] ?? ['text'];

        return in_array($block->type, $allowedTypes);
    }
}
