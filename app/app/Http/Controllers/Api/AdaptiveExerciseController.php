<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdaptiveExerciseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdaptiveExerciseController extends Controller
{
    private AdaptiveExerciseService $adaptiveService;

    public function __construct(AdaptiveExerciseService $adaptiveService)
    {
        $this->adaptiveService = $adaptiveService;
    }

    /**
     * Generate adaptive exercises for a child
     */
    public function generateForChild(Request $request, User $child): JsonResponse
    {
        $validated = $request->validate([
            'count' => 'integer|min:1|max:10',
            'session_length' => 'integer|min:5|max:60',
            'focus_areas' => 'array',
            'focus_areas.*' => 'string|in:pronunciation,articulation,rhythm,memory',
        ]);

        $count = $validated['count'] ?? 5;
        $sessionParams = [
            'length' => $validated['session_length'] ?? 20,
            'focus_areas' => $validated['focus_areas'] ?? null,
        ];

        $exercises = $this->adaptiveService->generateAdaptiveExercises($child, $count);

        return response()->json([
            'child_id' => $child->id,
            'child_age_group' => $this->getChildAgeGroup($child),
            'session_params' => $sessionParams,
            'generated_exercises' => $exercises->map(fn ($exercise) => [
                'id' => $exercise->id,
                'title' => $exercise->title,
                'type' => $exercise->type,
                'difficulty' => $exercise->difficulty,
                'estimated_duration' => $exercise->estimated_duration,
                'content_preview' => $this->getContentPreview($exercise->content),
            ]),
        ]);
    }

    /**
     * Generate a complete exercise session
     */
    public function generateSession(Request $request, User $child): JsonResponse
    {
        $validated = $request->validate([
            'length' => 'required|integer|min:10|max:60',
            'focus_areas' => 'array',
            'focus_areas.*' => 'string|in:pronunciation,articulation,rhythm,memory,other',
        ]);

        $exercises = $this->adaptiveService->generateSessionExercises($child, $validated);

        return response()->json([
            'session' => [
                'child_id' => $child->id,
                'estimated_duration' => $exercises->sum('estimated_duration'),
                'exercises_count' => $exercises->count(),
                'skill_coverage' => $this->analyzeSkillCoverage($exercises),
                'exercises' => $exercises,
            ],
        ]);
    }

    /**
     * Get child's current skill assessment
     */
    public function getSkillAssessment(Request $request, User $child): JsonResponse
    {
        $skillLevels = $this->adaptiveService->assessSkillLevels($child);
        $ageGroup = $this->getChildAgeGroup($child);
        $preferences = $this->adaptiveService->getChildPreferences($child);

        return response()->json([
            'child_id' => $child->id,
            'age_group' => $ageGroup,
            'overall_assessment' => $this->generateOverallAssessment($skillLevels),
            'skill_levels' => $skillLevels,
            'preferences' => $preferences,
            'recommendations' => $this->generateRecommendations($skillLevels, $ageGroup),
        ]);
    }

    /**
     * Get next recommended exercises
     */
    public function getRecommendations(Request $request, User $child): JsonResponse
    {
        $validated = $request->validate([
            'limit' => 'integer|min:1|max:5',
        ]);

        $limit = $validated['limit'] ?? 3;
        $exercises = $this->adaptiveService->generateAdaptiveExercises($child, $limit);

        return response()->json([
            'child_id' => $child->id,
            'recommended_exercises' => $exercises,
            'reasoning' => $this->getRecommendationReasoning($child, $exercises),
        ]);
    }

    /**
     * Update child's preferences based on feedback
     */
    public function updatePreferences(Request $request, User $child): JsonResponse
    {
        $validated = $request->validate([
            'favorite_types' => 'array',
            'favorite_types.*' => 'string|in:pronunciation,articulation,rhythm,memory,other',
            'avoid_types' => 'array',
            'avoid_types.*' => 'string|in:pronunciation,articulation,rhythm,memory,other',
            'optimal_session_length' => 'integer|min:5|max:60',
            'preferred_difficulty' => 'string|in:easy,medium,hard',
        ]);

        // Здесь можно сохранить предпочтения в отдельную таблицу или в metadata пользователя
        // Пока просто возвращаем обновленные предпочтения

        return response()->json([
            'message' => 'Preferences updated',
            'preferences' => $validated,
        ]);
    }

    /**
     * Get exercise statistics for therapist
     */
    public function getProgressStats(Request $request, User $child): JsonResponse
    {
        $skillLevels = $this->adaptiveService->assessSkillLevels($child);

        $stats = [
            'total_exercises_completed' => 0,
            'average_score' => 0,
            'improvement_trend' => 'stable',
            'strong_areas' => [],
            'areas_needing_work' => [],
            'session_streak' => 0,
            'last_activity' => null,
        ];

        foreach ($skillLevels as $type => $level) {
            $stats['total_exercises_completed'] += $level['attempts'];

            if ($level['score'] > 0) {
                $stats['average_score'] += $level['score'];
            }

            if ($level['level'] === 'advanced' || $level['level'] === 'expert') {
                $stats['strong_areas'][] = $type;
            } elseif ($level['level'] === 'beginner') {
                $stats['areas_needing_work'][] = $type;
            }
        }

        $stats['average_score'] = $stats['total_exercises_completed'] > 0
            ? $stats['average_score'] / count($skillLevels)
            : 0;

        return response()->json([
            'child_id' => $child->id,
            'statistics' => $stats,
            'detailed_breakdown' => $skillLevels,
        ]);
    }

    // Вспомогательные методы

    private function getChildAgeGroup(User $child): string
    {
        if (! $child->birth_date) {
            return 'unknown';
        }

        $age = now()->diffInYears($child->birth_date);

        return match (true) {
            $age < 4 => 'toddler',
            $age < 7 => 'preschool',
            $age < 12 => 'school_junior',
            $age < 16 => 'school_senior',
            default => 'teen_adult'
        };
    }

    private function getContentPreview(array $content): array
    {
        return [
            'exercise_type' => $content['exercise_type'] ?? 'unknown',
            'items_count' => count($content['items'] ?? []),
            'has_instructions' => ! empty($content['instructions'] ?? []),
        ];
    }

    private function analyzeSkillCoverage(Collection $exercises): array
    {
        $types = $exercises->groupBy('type');
        $difficulties = $exercises->groupBy('difficulty');

        return [
            'types_covered' => $types->keys()->toArray(),
            'difficulty_distribution' => $difficulties->map->count()->toArray(),
            'estimated_total_time' => $exercises->sum('estimated_duration'),
        ];
    }

    private function generateOverallAssessment(array $skillLevels): string
    {
        $levels = collect($skillLevels)->pluck('level');
        $beginnerCount = $levels->filter(fn ($level) => $level === 'beginner')->count();
        $expertCount = $levels->filter(fn ($level) => $level === 'expert')->count();

        if ($expertCount >= 2) {
            return 'Продвинутый уровень развития речи';
        } elseif ($beginnerCount >= 2) {
            return 'Нуждается в базовом развитии навыков речи';
        } else {
            return 'Уровень развития речи соответствует возрасту';
        }
    }

    private function generateRecommendations(array $skillLevels, string $ageGroup): array
    {
        $recommendations = [];

        foreach ($skillLevels as $type => $level) {
            if ($level['level'] === 'beginner') {
                $recommendations[] = [
                    'type' => $type,
                    'priority' => 'high',
                    'suggestion' => "Рекомендуется регулярная практика упражнений по {$this->getTypeName($type)}",
                ];
            }
        }

        if (empty($recommendations)) {
            $recommendations[] = [
                'type' => 'general',
                'priority' => 'medium',
                'suggestion' => 'Поддерживать текущий уровень через разнообразные упражнения',
            ];
        }

        return $recommendations;
    }

    private function getTypeName(string $type): string
    {
        return match ($type) {
            'pronunciation' => 'произношению',
            'articulation' => 'артикуляции',
            'rhythm' => 'ритму речи',
            'memory' => 'памяти и вниманию',
            default => 'общим навыкам речи'
        };
    }

    private function getRecommendationReasoning(User $child, Collection $exercises): array
    {
        $skillLevels = $this->adaptiveService->assessSkillLevels($child);

        return [
            'skill_based_selection' => $exercises->map(function ($exercise) use ($skillLevels) {
                $skillLevel = $skillLevels[$exercise->type] ?? null;

                return [
                    'exercise_type' => $exercise->type,
                    'reason' => $skillLevel ? "Уровень навыка: {$skillLevel['level']}" : 'Новый тип упражнения',
                ];
            }),
            'age_considerations' => $this->getChildAgeGroup($child),
            'session_balance' => 'Сбалансированное покрытие разных навыков',
        ];
    }
}
