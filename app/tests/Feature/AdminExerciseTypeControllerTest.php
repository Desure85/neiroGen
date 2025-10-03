<?php

namespace Tests\Feature;

use App\Models\Exercise;
use App\Models\ExerciseType;
use App\Models\ExerciseTypeField;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminExerciseTypeControllerTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_list_exercise_types(): void
    {
        ExerciseType::factory()->count(3)->create();

        $this->actingAsAdmin();

        $response = $this->getJson('/api/admin/exercise-types')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'key', 'is_active', 'display_order'],
                ],
                'meta' => ['total'],
            ]);

        $response->assertJsonCount(3, 'data');
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_admin_can_filter_exercise_types_by_search_and_domain(): void
    {
        ExerciseType::factory()->create([
            'name' => 'Графический диктант',
            'key' => 'graphic_dictation',
            'domain' => 'neuro',
        ]);

        ExerciseType::factory()->create([
            'name' => 'Артикуляция',
            'key' => 'articulation',
            'domain' => 'speech',
        ]);

        $this->actingAsAdmin();

        $response = $this->getJson('/api/admin/exercise-types?domain=neuro&search=диктант')
            ->assertOk();

        $response->assertJsonCount(1, 'data');
        $this->assertSame('graphic_dictation', $response->json('data.0.key'));
    }

    public function test_admin_can_create_exercise_type(): void
    {
        $this->actingAsAdmin();

        $payload = [
            'name' => 'Новое упражнение',
            'key' => 'new_exercise',
            'domain' => 'speech',
            'icon' => '🆕',
            'description' => 'Описание упражнения',
            'display_order' => 10,
            'is_active' => true,
            'meta' => [
                'tags' => ['custom'],
            ],
        ];

        $response = $this->postJson('/api/admin/exercise-types', $payload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Новое упражнение')
            ->assertJsonPath('data.key', 'new_exercise');

        $this->assertDatabaseHas('exercise_types', [
            'key' => 'new_exercise',
            'domain' => 'speech',
            'icon' => '🆕',
            'is_active' => true,
        ]);

        $this->assertArrayHasKey('meta', $response->json('data'));
    }

    public function test_admin_can_update_exercise_type_and_sync_exercises(): void
    {
        $type = ExerciseType::factory()->create([
            'name' => 'Старое имя',
            'key' => 'old_key',
        ]);

        $exercise = Exercise::factory()->create([
            'exercise_type_id' => $type->id,
            'type' => 'old_key',
        ]);

        $this->actingAsAdmin();

        $payload = [
            'name' => 'Новое имя',
            'key' => 'updated_key',
            'domain' => 'behavioral',
            'is_active' => false,
        ];

        $response = $this->putJson("/api/admin/exercise-types/{$type->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.key', 'updated_key')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('exercise_types', [
            'id' => $type->id,
            'key' => 'updated_key',
            'domain' => 'behavioral',
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('exercises', [
            'id' => $exercise->id,
            'exercise_type_id' => $type->id,
            'type' => 'updated_key',
        ]);
    }

    public function test_admin_cannot_delete_type_with_attached_exercises(): void
    {
        $type = ExerciseType::factory()->create();
        Exercise::factory()->create([
            'exercise_type_id' => $type->id,
            'type' => $type->key,
        ]);

        $this->actingAsAdmin();

        $this->deleteJson("/api/admin/exercise-types/{$type->id}")
            ->assertStatus(409)
            ->assertJsonFragment([
                'message' => 'Нельзя удалить тип упражнения, пока к нему привязаны упражнения.',
            ]);

        $this->assertDatabaseHas('exercise_types', ['id' => $type->id]);
    }

    public function test_admin_can_delete_type_without_exercises(): void
    {
        $type = ExerciseType::factory()->create();

        $this->actingAsAdmin();

        $this->deleteJson("/api/admin/exercise-types/{$type->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('exercise_types', ['id' => $type->id]);
    }

    public function test_admin_can_add_field_to_exercise_type(): void
    {
        $type = ExerciseType::factory()->create();

        $this->actingAsAdmin();

        $payload = [
            'label' => 'Продолжительность',
            'key' => 'duration',
            'field_type' => 'integer',
            'is_required' => true,
            'min_value' => 1,
            'max_value' => 10,
            'step' => 1,
            'default_value' => json_encode(5),
            'options' => json_encode([1, 2, 3, 4, 5]),
            'help_text' => 'Минуты выполнения',
        ];

        $response = $this->postJson("/api/admin/exercise-types/{$type->id}/fields", $payload)
            ->assertCreated()
            ->assertJsonPath('data.key', 'duration');

        $this->assertDatabaseHas('exercise_type_fields', [
            'exercise_type_id' => $type->id,
            'key' => 'duration',
            'is_required' => true,
        ]);

        $this->assertSame(1, ExerciseTypeField::where('exercise_type_id', $type->id)->count());
    }

    public function test_admin_can_delete_field_from_exercise_type(): void
    {
        $field = ExerciseTypeField::factory()->create();
        $type = $field->exerciseType;

        $this->actingAsAdmin();

        $this->deleteJson("/api/admin/exercise-types/{$type->id}/fields/{$field->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('exercise_type_fields', ['id' => $field->id]);
    }

    public function test_route_returns_404_for_field_from_another_type(): void
    {
        $type = ExerciseType::factory()->create();
        $another = ExerciseType::factory()->create();
        $foreignField = ExerciseTypeField::factory()->create([
            'exercise_type_id' => $another->id,
        ]);

        $this->actingAsAdmin();

        $this->deleteJson("/api/admin/exercise-types/{$type->id}/fields/{$foreignField->id}")
            ->assertNotFound();
    }

    public function test_admin_can_update_field_of_exercise_type(): void
    {
        $field = ExerciseTypeField::factory()->create([
            'label' => 'Продолжительность',
            'key' => 'duration',
            'field_type' => 'integer',
            'is_required' => true,
            'default_value' => 5,
        ]);

        $this->actingAsAdmin();

        $payload = [
            'label' => 'Длительность занятия',
            'is_required' => false,
            'default_value' => json_encode(10),
            'help_text' => 'Количество минут',
        ];

        $response = $this->patchJson(
            "/api/admin/exercise-types/{$field->exercise_type_id}/fields/{$field->id}",
            $payload,
        )->assertOk();

        $response->assertJsonPath('data.label', 'Длительность занятия');
        $response->assertJsonPath('data.is_required', false);
        $response->assertJsonPath('data.help_text', 'Количество минут');
        $response->assertJsonPath('data.default_value', 10);

        $this->assertDatabaseHas('exercise_type_fields', [
            'id' => $field->id,
            'label' => 'Длительность занятия',
            'is_required' => false,
            'help_text' => 'Количество минут',
        ]);
    }

    public function test_admin_can_reorder_fields_of_exercise_type(): void
    {
        $type = ExerciseType::factory()->create();
        $fields = ExerciseTypeField::factory()->count(3)->sequence(
            ['label' => 'Первое', 'display_order' => 0],
            ['label' => 'Второе', 'display_order' => 1],
            ['label' => 'Третье', 'display_order' => 2],
        )->create([
            'exercise_type_id' => $type->id,
        ]);

        $this->actingAsAdmin();

        $newOrder = [$fields[2]->id, $fields[0]->id, $fields[1]->id];

        $this->postJson(
            "/api/admin/exercise-types/{$type->id}/fields/reorder",
            ['order' => $newOrder],
        )->assertNoContent();

        $orderedIds = ExerciseTypeField::where('exercise_type_id', $type->id)
            ->orderBy('display_order')
            ->pluck('id')
            ->toArray();

        $this->assertSame($newOrder, $orderedIds);
    }
}
