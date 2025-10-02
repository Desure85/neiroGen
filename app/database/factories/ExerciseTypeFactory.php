<?php

namespace Database\Factories;

use App\Models\ExerciseType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ExerciseType>
 */
class ExerciseTypeFactory extends Factory
{
    protected $model = ExerciseType::class;

    public function definition(): array
    {
        $key = Str::slug($this->faker->unique()->words(2, true), '_');

        return [
            'key' => $key,
            'name' => Str::title(str_replace('_', ' ', $key)),
            'domain' => $this->faker->randomElement(['neuro', 'speech', 'behavioral']),
            'icon' => '🧠',
            'description' => $this->faker->sentence(),
            'is_active' => true,
            'display_order' => $this->faker->numberBetween(0, 100),
            'meta' => [
                'tags' => $this->faker->words(3),
            ],
        ];
    }
}
