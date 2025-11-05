<?php

namespace Database\Factories;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Worksheet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Worksheet>
 */
class WorksheetFactory extends Factory
{
    protected $model = Worksheet::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'created_by' => User::factory(),
            'title' => $this->faker->sentence(3),
            'status' => 'draft',
            'format' => 'A4',
            'copies' => 1,
            'fields_snapshot' => [
                ['key' => 'child_name', 'label' => 'Имя ребёнка', 'value' => $this->faker->firstName()],
            ],
            'meta' => ['language' => 'ru'],
            'notes' => $this->faker->sentence(),
            'generated_at' => null,
            'pdf_path' => null,
        ];
    }
}
