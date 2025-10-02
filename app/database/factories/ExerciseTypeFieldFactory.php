<?php

namespace Database\Factories;

use App\Models\ExerciseType;
use App\Models\ExerciseTypeField;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ExerciseTypeField>
 */
class ExerciseTypeFieldFactory extends Factory
{
    protected $model = ExerciseTypeField::class;

    public function definition(): array
    {
        $key = Str::slug($this->faker->unique()->word(), '_');

        return [
            'exercise_type_id' => ExerciseType::factory(),
            'key' => $key,
            'label' => Str::headline($key),
            'field_type' => $this->faker->randomElement([
                'string',
                'text',
                'integer',
                'number',
                'boolean',
                'enum',
                'array_enum',
                'json',
            ]),
            'is_required' => $this->faker->boolean(),
            'min_value' => null,
            'max_value' => null,
            'step' => null,
            'default_value' => null,
            'options' => null,
            'help_text' => $this->faker->optional()->sentence(),
            'display_order' => $this->faker->numberBetween(0, 20),
        ];
    }
}
