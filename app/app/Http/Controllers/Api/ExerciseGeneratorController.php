<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExerciseGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExerciseGeneratorController extends Controller
{
    private ExerciseGeneratorService $generator;

    public function __construct(ExerciseGeneratorService $generator)
    {
        $this->generator = $generator;
    }

    /**
     * Generate a single exercise
     */
    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'difficulty' => 'required|string|in:easy,medium,hard',
            'custom_params' => 'nullable|array',
        ]);

        try {
            $exercise = $this->generator->generateExercise(
                $validated['type'],
                $validated['difficulty'],
                $validated['custom_params'] ?? []
            );

            return response()->json($exercise, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to generate exercise: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate multiple exercises
     */
    public function generateBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'count' => 'required|integer|min:1|max:20',
            'types' => 'required|array|min:1',
            'types.*' => 'string',
            'difficulties' => 'required|array|min:1',
            'difficulties.*' => 'string|in:easy,medium,hard',
            'custom_params' => 'nullable|array',
        ]);

        try {
            $exercises = $this->generator->generateBatch($validated['count'], $validated);

            return response()->json([
                'generated_count' => $exercises->count(),
                'exercises' => $exercises,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to generate exercises: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get available exercise types
     */
    public function getTypes(): JsonResponse
    {
        return response()->json([
            'types' => [
                'pronunciation' => [
                    'name' => 'Произношение',
                    'description' => 'Упражнения для правильного произношения звуков',
                    'icon' => '🗣️',
                ],
                'articulation' => [
                    'name' => 'Артикуляция',
                    'description' => 'Развитие артикуляционной моторики',
                    'icon' => '👅',
                ],
                'rhythm' => [
                    'name' => 'Ритм',
                    'description' => 'Чувство ритма и темпа речи',
                    'icon' => '🎵',
                ],
                'memory' => [
                    'name' => 'Память',
                    'description' => 'Развитие памяти и внимания',
                    'icon' => '🧠',
                ],
                'other' => [
                    'name' => 'Другие',
                    'description' => 'Специальные упражнения',
                    'icon' => '✨',
                ],
            ],
            'difficulties' => [
                'easy' => [
                    'name' => 'Легкий',
                    'description' => 'Для начинающих',
                    'color' => 'green',
                ],
                'medium' => [
                    'name' => 'Средний',
                    'description' => 'Для продолжающих',
                    'color' => 'yellow',
                ],
                'hard' => [
                    'name' => 'Сложный',
                    'description' => 'Для продвинутых',
                    'color' => 'red',
                ],
            ],
        ]);
    }

    /**
     * Get exercise templates for custom generation
     */
    public function getTemplates(Request $request): JsonResponse
    {
        $type = $request->query('type');

        if (! $type) {
            return response()->json([
                'error' => 'Type parameter is required',
            ], 400);
        }

        $templates = match ($type) {
            'pronunciation' => [
                'syllables' => ['ма', 'па', 'ба', 'да', 'га', 'ка', 'та', 'на', 'ла', 'са'],
                'words' => ['мама', 'папа', 'дом', 'лес', 'кот', 'собака'],
                'phrases' => ['Мама мыла раму', 'Папа чинит машину'],
            ],
            'articulation' => [
                'sounds' => ['р', 'л', 'с', 'з', 'ш', 'ж', 'ч', 'щ'],
                'patterns' => ['Карл у Клары', 'Шла Саша', 'Рыба в озере'],
            ],
            'rhythm' => [
                'patterns' => ['та-та', 'там-там', 'дин-дон'],
                'sequences' => [['short', 'long'], ['long', 'short', 'short']],
            ],
            'memory' => [
                'sequences' => [
                    'numbers' => range(1, 10),
                    'colors' => ['красный', 'синий', 'зелёный', 'жёлтый'],
                    'animals' => ['кот', 'собака', 'птица', 'рыба'],
                ],
            ],
            default => []
        };

        return response()->json([
            'type' => $type,
            'templates' => $templates,
        ]);
    }

    /**
     * Validate exercise content
     */
    public function validateContent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content' => 'required|array',
            'type' => 'required|string|in:pronunciation,articulation,rhythm,memory,other',
            'difficulty' => 'required|string|in:easy,medium,hard',
        ]);

        // Базовая валидация структуры контента
        $errors = [];

        if (! isset($validated['content']['items']) || empty($validated['content']['items'])) {
            $errors[] = 'Content must contain items array';
        }

        if (! isset($validated['content']['exercise_type'])) {
            $errors[] = 'Content must specify exercise_type';
        }

        $isValid = empty($errors);

        return response()->json([
            'valid' => $isValid,
            'errors' => $errors,
            'suggestions' => $isValid ? $this->getSuggestions($validated['type'], $validated['content']) : [],
        ]);
    }

    private function getSuggestions(string $type, array $content): array
    {
        $suggestions = [];

        switch ($type) {
            case 'pronunciation':
                if (count($content['items'] ?? []) < 3) {
                    $suggestions[] = 'Рекомендуется минимум 3 слога для эффективного упражнения';
                }
                break;
            case 'memory':
                if (count($content['items'] ?? []) > 7) {
                    $suggestions[] = 'Для упражнений на память рекомендуется не более 7 элементов';
                }
                break;
        }

        return $suggestions;
    }
}
