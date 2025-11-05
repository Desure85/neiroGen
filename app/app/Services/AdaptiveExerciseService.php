<?php

namespace App\Services;

use App\Models\ChildProgress;
use App\Models\User;
use Illuminate\Support\Collection;

class AdaptiveExerciseService
{
    private ExerciseGeneratorService $generator;

    public function __construct(ExerciseGeneratorService $generator)
    {
        $this->generator = $generator;
    }

    /**
     * Адаптивно генерирует упражнения для ребенка
     */
    public function generateAdaptiveExercises(User $child, int $count = 5): Collection
    {
        $ageGroup = $this->determineAgeGroup($child);
        $skillLevels = $this->assessSkillLevels($child);
        $preferences = $this->getChildPreferences($child);

        $exercises = collect();

        for ($i = 0; $i < $count; $i++) {
            $exerciseType = $this->selectNextExerciseType($skillLevels, $preferences);
            $difficulty = $this->calculateOptimalDifficulty($child, $exerciseType, $skillLevels);

            $exercise = $this->generator->generateExercise($exerciseType, $difficulty, [
                'age_group' => $ageGroup,
                'skill_focus' => $this->identifySkillFocus($skillLevels, $exerciseType),
                'session_context' => 'adaptive_generation',
            ]);

            $exercises->push($exercise);
        }

        return $exercises;
    }

    /**
     * Определяет возрастную группу ребенка
     */
    private function determineAgeGroup(User $child): string
    {
        if (! $child->birth_date) {
            return 'unknown';
        }

        $age = now()->diffInYears($child->birth_date);

        return match (true) {
            $age < 4 => 'toddler',      // 0-3 года
            $age < 7 => 'preschool',    // 4-6 лет
            $age < 12 => 'school_junior', // 7-11 лет
            $age < 16 => 'school_senior', // 12-15 лет
            default => 'teen_adult'     // 16+ лет
        };
    }

    /**
     * Оценивает уровни навыков ребенка по типам упражнений
     */
    private function assessSkillLevels(User $child): array
    {
        $progress = ChildProgress::where('user_id', $child->id)
            ->with('exercise')
            ->get()
            ->groupBy(fn ($p) => $p->exercise->type);

        $skillLevels = [];

        foreach (['pronunciation', 'articulation', 'rhythm', 'memory'] as $type) {
            $typeProgress = $progress->get($type, collect());

            if ($typeProgress->isEmpty()) {
                $skillLevels[$type] = ['level' => 'beginner', 'score' => 0, 'attempts' => 0];
            } else {
                $avgScore = $typeProgress->avg('score');
                $totalAttempts = $typeProgress->sum('attempts');

                $skillLevels[$type] = [
                    'level' => $this->calculateSkillLevel($avgScore, $totalAttempts),
                    'score' => $avgScore,
                    'attempts' => $totalAttempts,
                    'last_practice' => $typeProgress->sortByDesc('updated_at')->first()->updated_at ?? null,
                ];
            }
        }

        return $skillLevels;
    }

    /**
     * Вычисляет уровень навыка на основе результатов
     */
    private function calculateSkillLevel(float $avgScore, int $totalAttempts): string
    {
        if ($totalAttempts < 3) {
            return 'beginner';
        }

        return match (true) {
            $avgScore >= 85 => 'expert',
            $avgScore >= 70 => 'advanced',
            $avgScore >= 50 => 'intermediate',
            default => 'beginner'
        };
    }

    /**
     * Получает предпочтения ребенка
     */
    private function getChildPreferences(User $child): array
    {
        // Здесь можно добавить логику анализа предпочтений на основе истории упражнений
        return [
            'favorite_types' => ['pronunciation', 'memory'], // По умолчанию
            'avoid_types' => [],
            'optimal_session_length' => 15, // минут
            'preferred_difficulty' => 'medium',
        ];
    }

    /**
     * Выбирает следующий тип упражнения
     */
    private function selectNextExerciseType(array $skillLevels, array $preferences): string
    {
        // Приоритет слабым навыкам
        $weakSkills = collect($skillLevels)->filter(fn ($skill) => $skill['level'] === 'beginner')->keys();

        if ($weakSkills->isNotEmpty()) {
            return $weakSkills->random();
        }

        // Избегать недавно практиковавшихся
        $recentlyPracticed = collect($skillLevels)
            ->filter(fn ($skill) => $skill['last_practice'] && $skill['last_practice']->diffInHours(now()) < 2)
            ->keys();

        $availableTypes = collect(['pronunciation', 'articulation', 'rhythm', 'memory'])
            ->diff($recentlyPracticed)
            ->intersect($preferences['favorite_types']);

        if ($availableTypes->isEmpty()) {
            $availableTypes = collect(['pronunciation', 'articulation', 'rhythm', 'memory'])
                ->diff($recentlyPracticed);
        }

        return $availableTypes->random();
    }

    /**
     * Вычисляет оптимальную сложность
     */
    private function calculateOptimalDifficulty(User $child, string $exerciseType, array $skillLevels): string
    {
        $currentLevel = $skillLevels[$exerciseType]['level'] ?? 'beginner';
        $recentPerformance = $this->getRecentPerformance($child, $exerciseType);

        // Адаптивная логика сложности
        if ($recentPerformance['trend'] === 'improving' && $recentPerformance['streak'] >= 3) {
            return $this->increaseDifficulty($currentLevel);
        }

        if ($recentPerformance['trend'] === 'declining' && $recentPerformance['streak'] >= 2) {
            return $this->decreaseDifficulty($currentLevel);
        }

        return $currentLevel === 'expert' ? 'hard' :
               ($currentLevel === 'advanced' ? 'medium' : 'easy');
    }

    /**
     * Получает недавнюю производительность
     */
    private function getRecentPerformance(User $child, string $exerciseType): array
    {
        $recentProgress = ChildProgress::where('user_id', $child->id)
            ->whereHas('exercise', fn ($q) => $q->where('type', $exerciseType))
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        if ($recentProgress->isEmpty()) {
            return ['trend' => 'stable', 'streak' => 0, 'avg_score' => 0];
        }

        $scores = $recentProgress->pluck('score');
        $avgScore = $scores->avg();

        // Простая логика тренда
        $trend = 'stable';
        if ($scores->count() >= 3) {
            $recentAvg = $scores->take(3)->avg();
            $olderAvg = $scores->skip(3)->avg();

            if ($recentAvg > $olderAvg + 5) {
                $trend = 'improving';
            } elseif ($recentAvg < $olderAvg - 5) {
                $trend = 'declining';
            }
        }

        return [
            'trend' => $trend,
            'streak' => $this->calculateStreak($scores),
            'avg_score' => $avgScore,
        ];
    }

    /**
     * Вычисляет текущую серию успехов/неудач
     */
    private function calculateStreak(Collection $scores): int
    {
        if ($scores->isEmpty()) {
            return 0;
        }

        $threshold = 60; // Проходной балл
        $streak = 0;
        $trend = $scores->first() >= $threshold ? 'success' : 'failure';

        foreach ($scores as $score) {
            $currentTrend = $score >= $threshold ? 'success' : 'failure';

            if ($currentTrend === $trend) {
                $streak++;
            } else {
                break;
            }
        }

        return $streak;
    }

    /**
     * Увеличивает сложность
     */
    private function increaseDifficulty(string $currentLevel): string
    {
        return match ($currentLevel) {
            'beginner' => 'easy',
            'easy' => 'medium',
            'medium' => 'hard',
            default => 'hard'
        };
    }

    /**
     * Уменьшает сложность
     */
    private function decreaseDifficulty(string $currentLevel): string
    {
        return match ($currentLevel) {
            'hard' => 'medium',
            'medium' => 'easy',
            'easy' => 'easy', // Минимум
            default => 'easy'
        };
    }

    /**
     * Определяет фокус навыка для упражнения
     */
    private function identifySkillFocus(array $skillLevels, string $exerciseType): string
    {
        $skillLevel = $skillLevels[$exerciseType] ?? null;

        if (! $skillLevel) {
            return 'basic_foundation';
        }

        return match ($skillLevel['level']) {
            'beginner' => 'basic_foundation',
            'intermediate' => 'skill_building',
            'advanced' => 'precision_refinement',
            'expert' => 'speed_fluency',
            default => 'basic_foundation'
        };
    }

    /**
     * Генерирует персонализированные упражнения для сессии
     */
    public function generateSessionExercises(User $child, array $sessionParams = []): Collection
    {
        $sessionLength = $sessionParams['length'] ?? 20; // минут
        $focusAreas = $sessionParams['focus_areas'] ?? null;

        $exercisesCount = max(3, min(8, intval($sessionLength / 4))); // 3-8 упражнений

        if ($focusAreas) {
            // Целевые упражнения по указанным областям
            $exercises = collect();
            foreach ($focusAreas as $area) {
                $difficulty = $this->calculateOptimalDifficulty($child, $area, $this->assessSkillLevels($child));
                $exercises->push($this->generator->generateExercise($area, $difficulty));
            }
        } else {
            // Адаптивные упражнения
            $exercises = $this->generateAdaptiveExercises($child, $exercisesCount);
        }

        return $exercises;
    }
}
