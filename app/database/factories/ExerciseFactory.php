<?php

namespace Database\Factories;

use App\Models\Exercise;
use App\Models\ExerciseType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Exercise>
 */
class ExerciseFactory extends Factory
{
    protected $model = Exercise::class;

    public function definition(): array
    {
        // Создаем или используем существующий тип
        $exerciseType = ExerciseType::firstOrCreate(
            ['key' => 'pronunciation'],
            [
                'name' => 'Произношение',
                'domain' => 'speech',
                'icon' => '🗣️',
                'description' => 'Упражнения на произношение',
                'is_active' => true,
                'display_order' => 1,
            ],
        );

        return [
            'tenant_id' => null,
            'created_by' => null,
            'exercise_type_id' => $exerciseType->id,
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->sentences(2, true),
            'content' => [
                'exercise_type' => 'pronunciation',
                'instructions' => [
                    'Повторяйте вслух за диктором',
                ],
                'blocks' => [],
                'custom_params' => [],
            ],
            'instructions' => [
                'Повторяйте вслух за диктором',
            ],
            'custom_params' => [],
            'type' => 'pronunciation',
            'difficulty' => 'easy',
            'estimated_duration' => 10,
            'tags' => [],
            'is_active' => true,
        ];
    }
}
