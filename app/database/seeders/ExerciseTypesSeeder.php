<?php

namespace Database\Seeders;

use App\Models\Exercise;
use App\Models\ExerciseType;
use App\Models\ExerciseTypeField;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class ExerciseTypesSeeder extends Seeder
{
    public function run(): void
    {
        $types = config('exercise_types.types', []);

        if (empty($types)) {
            return;
        }

        $order = 0;
        $typeIdsByKey = [];

        foreach ($types as $key => $definition) {
            $typeModel = ExerciseType::updateOrCreate(
                ['key' => $key],
                [
                    'name' => $definition['name'] ?? Str::headline($key),
                    'domain' => $definition['domain'] ?? null,
                    'icon' => $definition['icon'] ?? null,
                    'description' => $definition['description'] ?? null,
                    'is_active' => Arr::get($definition, 'is_active', true),
                    'display_order' => Arr::get($definition, 'display_order', $order),
                    'meta' => $this->buildMeta($definition),
                ]
            );

            $typeIdsByKey[$key] = $typeModel->id;

            $schema = $definition['schema'] ?? [];
            $existingFieldIds = [];
            $fieldOrder = 0;

            foreach ($schema as $fieldKey => $fieldDefinition) {
                $fieldModel = ExerciseTypeField::updateOrCreate(
                    [
                        'exercise_type_id' => $typeModel->id,
                        'key' => $fieldKey,
                    ],
                    [
                        'label' => $fieldDefinition['label'] ?? Str::headline($fieldKey),
                        'field_type' => $fieldDefinition['type'] ?? 'string',
                        'is_required' => (bool) Arr::get($fieldDefinition, 'required', false),
                        'min_value' => $this->normalizeNumeric(Arr::get($fieldDefinition, 'min')),
                        'max_value' => $this->normalizeNumeric(Arr::get($fieldDefinition, 'max')),
                        'step' => $this->normalizeNumeric(Arr::get($fieldDefinition, 'step')),
                        'default_value' => Arr::has($fieldDefinition, 'default')
                            ? Arr::get($fieldDefinition, 'default')
                            : null,
                        'options' => Arr::get($fieldDefinition, 'values')
                            ?? Arr::get($fieldDefinition, 'options')
                            ?? null,
                        'help_text' => $fieldDefinition['description'] ?? null,
                        'display_order' => Arr::get($fieldDefinition, 'order', $fieldOrder),
                    ]
                );

                $existingFieldIds[] = $fieldModel->id;
                $fieldOrder++;
            }

            if (! empty($existingFieldIds)) {
                $typeModel
                    ->fields()
                    ->whereNotIn('id', $existingFieldIds)
                    ->delete();
            }

            $order++;
        }

        if (! empty($typeIdsByKey)) {
            $this->syncExercises($typeIdsByKey);
        }
    }

    private function buildMeta(array $definition): array
    {
        $meta = [];

        foreach (['defaults', 'resources', 'tags'] as $key) {
            if (array_key_exists($key, $definition)) {
                $meta[$key] = $definition[$key];
            }
        }

        return $meta;
    }

    private function normalizeNumeric($value): ?float
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }

    private function syncExercises(array $typeIdsByKey): void
    {
        $keys = array_keys($typeIdsByKey);

        $exercises = Exercise::query()
            ->whereIn('type', $keys)
            ->get(['id', 'type']);

        foreach ($exercises as $exercise) {
            $exerciseTypeId = $typeIdsByKey[$exercise->type] ?? null;
            if (! $exerciseTypeId) {
                continue;
            }

            $exercise->update(['exercise_type_id' => $exerciseTypeId]);
        }
    }
}
