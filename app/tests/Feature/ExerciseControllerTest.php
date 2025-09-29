<?php

namespace Tests\Feature;

use App\Models\ContentBlock;
use App\Models\Exercise;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExerciseControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_paginated_list_scoped_to_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $teacher = User::factory()->create([
            'tenant_id' => $tenantA->id,
            'role' => 'teacher',
        ]);

        Exercise::factory()->create([
            'tenant_id' => $tenantA->id,
            'created_by' => $teacher->id,
            'title' => 'Гласные',
            'description' => 'Упражнение на гласные',
            'type' => 'pronunciation',
            'difficulty' => 'easy',
            'tags' => ['vowel'],
        ]);

        Exercise::factory()->create([
            'tenant_id' => $tenantB->id,
            'created_by' => null,
            'title' => 'Сложные согласные',
            'description' => 'Не должно вернуться',
            'type' => 'articulation',
            'difficulty' => 'medium',
        ]);

        Sanctum::actingAs($teacher);

        $response = $this->getJson('/api/exercises?search=глас&tag=vowel&per_page=10')
            ->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $response->assertJsonCount(1, 'data');
        $this->assertSame('Гласные', $response->json('data.0.title'));
    }

    public function test_store_creates_exercise_with_blocks_and_sets_scope(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'teacher',
        ]);

        $contentBlock = ContentBlock::create([
            'type' => 'text',
            'title' => 'Блок инструкции',
            'content' => ['text' => 'Повтори звук'],
            'metadata' => [],
            'settings' => [],
            'is_template' => false,
            'created_by' => $teacher->id,
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($teacher);

        $payload = [
            'title' => 'Произношение звука Р',
            'description' => 'Работаем над звуком Р',
            'content' => [
                'exercise_type' => 'pronunciation',
                'instructions' => ['Повторяй за логопедом'],
                'blocks' => [['id' => $contentBlock->id, 'title' => $contentBlock->title]],
            ],
            'instructions' => ['Повторяй за логопедом'],
            'custom_params' => ['repeat' => 3],
            'type' => 'pronunciation',
            'difficulty' => 'easy',
            'estimated_duration' => 15,
            'tags' => ['r-sound'],
            'is_active' => true,
            'blocks' => [
                [
                    'id' => $contentBlock->id,
                    'order' => 2,
                    'delay' => 5,
                    'settings' => ['volume' => 'high'],
                ],
            ],
        ];

        $response = $this->postJson('/api/exercises', $payload)
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', $tenant->id)
            ->assertJsonPath('data.blocks.0.id', $contentBlock->id)
            ->assertJsonPath('data.blocks.0.order', 2)
            ->assertJsonPath('data.instructions.0', 'Повторяй за логопедом');

        $exerciseId = $response->json('data.id');

        $this->assertDatabaseHas('exercises', [
            'id' => $exerciseId,
            'tenant_id' => $tenant->id,
            'created_by' => $teacher->id,
            'type' => 'pronunciation',
            'difficulty' => 'easy',
        ]);

        $this->assertDatabaseHas('exercise_blocks', [
            'exercise_id' => $exerciseId,
            'content_block_id' => $contentBlock->id,
            'order' => 2,
            'delay' => 5,
        ]);
    }

    public function test_show_returns_404_for_foreign_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $teacher = User::factory()->create(['tenant_id' => $tenantA->id]);
        $otherUser = User::factory()->create(['tenant_id' => $tenantB->id]);

        $exercise = Exercise::factory()->create([
            'tenant_id' => $tenantB->id,
            'created_by' => $otherUser->id,
            'title' => 'Чужое упражнение',
        ]);

        Sanctum::actingAs($teacher);

        $this->getJson('/api/exercises/'.$exercise->id)->assertNotFound();
    }

    public function test_update_modifies_fields_and_resyncs_blocks(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = User::factory()->create(['tenant_id' => $tenant->id]);

        $initialBlock = ContentBlock::create([
            'type' => 'text',
            'title' => 'Старый блок',
            'content' => ['text' => 'старый'],
            'metadata' => [],
            'settings' => [],
            'is_template' => false,
            'created_by' => $teacher->id,
            'tenant_id' => $tenant->id,
        ]);

        $exercise = Exercise::factory()->create([
            'tenant_id' => $tenant->id,
            'created_by' => $teacher->id,
            'title' => 'Исходное упражнение',
            'type' => 'pronunciation',
            'difficulty' => 'easy',
            'instructions' => ['старое'],
        ]);
        $exercise->contentBlocks()->attach($initialBlock->id, ['order' => 1]);

        $newBlock = ContentBlock::create([
            'type' => 'text',
            'title' => 'Новый блок',
            'content' => ['text' => 'новый'],
            'metadata' => [],
            'settings' => ['color' => 'blue'],
            'is_template' => false,
            'created_by' => $teacher->id,
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($teacher);

        $payload = [
            'title' => 'Обновлённое упражнение',
            'difficulty' => 'medium',
            'instructions' => ['новое'],
            'blocks' => [
                [
                    'id' => $newBlock->id,
                    'order' => 1,
                    'delay' => 0,
                ],
            ],
        ];

        $this->putJson('/api/exercises/'.$exercise->id, $payload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Обновлённое упражнение')
            ->assertJsonPath('data.difficulty', 'medium')
            ->assertJsonPath('data.blocks.0.id', $newBlock->id)
            ->assertJsonPath('data.instructions.0', 'новое');

        $this->assertDatabaseHas('exercises', [
            'id' => $exercise->id,
            'difficulty' => 'medium',
        ]);

        $this->assertDatabaseHas('exercise_blocks', [
            'exercise_id' => $exercise->id,
            'content_block_id' => $newBlock->id,
            'order' => 1,
        ]);

        $this->assertDatabaseMissing('exercise_blocks', [
            'exercise_id' => $exercise->id,
            'content_block_id' => $initialBlock->id,
        ]);
    }

    public function test_destroy_deletes_exercise_and_blocks(): void
    {
        $tenant = Tenant::factory()->create();
        $teacher = User::factory()->create(['tenant_id' => $tenant->id]);

        $block = ContentBlock::create([
            'type' => 'text',
            'title' => 'Удаляемый блок',
            'content' => ['text' => 'для удаления'],
            'metadata' => [],
            'settings' => [],
            'is_template' => false,
            'created_by' => $teacher->id,
            'tenant_id' => $tenant->id,
        ]);

        $exercise = Exercise::factory()->create([
            'tenant_id' => $tenant->id,
            'created_by' => $teacher->id,
            'title' => 'Удаляемое упражнение',
        ]);
        $exercise->contentBlocks()->attach($block->id, ['order' => 1]);

        Sanctum::actingAs($teacher);

        $this->deleteJson('/api/exercises/'.$exercise->id)->assertNoContent();

        $this->assertDatabaseMissing('exercises', ['id' => $exercise->id]);
        $this->assertDatabaseMissing('exercise_blocks', [
            'exercise_id' => $exercise->id,
            'content_block_id' => $block->id,
        ]);
    }
}
