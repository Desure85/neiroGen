<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Worksheet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorksheetControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_tenant_scoped_list(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenantA->id]);

        Worksheet::factory()->create([
            'tenant_id' => $tenantA->id,
            'created_by' => $user->id,
            'title' => 'Tenant A Worksheet',
        ]);

        Worksheet::factory()->create([
            'tenant_id' => $tenantB->id,
            'title' => 'Tenant B Worksheet',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/worksheets')->assertOk();

        $titles = collect($response->json('data'))->pluck('title');

        $this->assertContains('Tenant A Worksheet', $titles);
        $this->assertNotContains('Tenant B Worksheet', $titles);
    }

    public function test_store_creates_worksheet_with_items(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        Sanctum::actingAs($user);

        $payload = [
            'title' => 'Worksheet Draft',
            'status' => 'draft',
            'notes' => 'Initial notes',
            'fields_snapshot' => [
                ['key' => 'child_name', 'label' => 'Имя ребёнка', 'value' => 'Илья'],
            ],
            'meta' => ['language' => 'ru'],
            'items' => [
                [
                    'exercise_id' => null,
                    'title' => 'Задание 1',
                    'instructions' => ['Повторяй звуки'],
                    'content_snapshot' => ['type' => 'text', 'body' => 'Контент'],
                    'can_regenerate' => true,
                ],
                [
                    'exercise_id' => null,
                    'content_snapshot' => ['type' => 'image', 'url' => 'https://example.com/img.png'],
                ],
            ],
        ];

        $response = $this->postJson('/api/worksheets', $payload)
            ->assertCreated()
            ->assertJsonPath('data.title', 'Worksheet Draft')
            ->assertJsonCount(2, 'data.items');

        $worksheetId = $response->json('data.id');

        $this->assertDatabaseHas('worksheets', [
            'id' => $worksheetId,
            'tenant_id' => $tenant->id,
            'created_by' => $user->id,
        ]);

        $this->assertDatabaseHas('worksheet_items', [
            'worksheet_id' => $worksheetId,
            'position' => 1,
            'title' => 'Задание 1',
            'can_regenerate' => true,
        ]);
    }

    public function test_show_returns_404_for_foreign_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $userA = User::factory()->create(['tenant_id' => $tenantA->id]);
        $userB = User::factory()->create(['tenant_id' => $tenantB->id]);

        $worksheet = Worksheet::factory()->create([
            'tenant_id' => $tenantB->id,
            'created_by' => $userB->id,
        ]);

        Sanctum::actingAs($userA);

        $this->getJson('/api/worksheets/'.$worksheet->id)->assertNotFound();
    }

    public function test_update_allows_reordering_and_replacing_items(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        $worksheet = Worksheet::factory()->create([
            'tenant_id' => $tenant->id,
            'created_by' => $user->id,
            'title' => 'Original title',
        ]);

        $firstItem = $worksheet->items()->create([
            'exercise_id' => null,
            'position' => 1,
            'title' => 'Старое задание',
            'instructions' => ['старое'],
            'content_snapshot' => ['type' => 'text', 'body' => 'старый контент'],
            'can_regenerate' => false,
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'title' => 'Updated title',
            'items' => [
                [
                    'id' => $firstItem->id,
                    'title' => 'Обновлённое задание',
                    'instructions' => ['новое'],
                    'content_snapshot' => ['type' => 'text', 'body' => 'новый контент'],
                    'can_regenerate' => true,
                ],
                [
                    'exercise_id' => null,
                    'title' => 'Новое задание 2',
                    'instructions' => ['ещё'],
                    'content_snapshot' => ['type' => 'image', 'url' => 'https://example.com/new.png'],
                ],
            ],
        ];

        $this->putJson('/api/worksheets/'.$worksheet->id, $payload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated title')
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.title', 'Обновлённое задание');

        $this->assertDatabaseHas('worksheet_items', [
            'id' => $firstItem->id,
            'title' => 'Обновлённое задание',
            'can_regenerate' => true,
        ]);

        $this->assertDatabaseHas('worksheet_items', [
            'worksheet_id' => $worksheet->id,
            'title' => 'Новое задание 2',
            'position' => 2,
        ]);

        $this->assertDatabaseMissing('worksheet_items', [
            'worksheet_id' => $worksheet->id,
            'position' => 3,
        ]);
    }

    public function test_regenerate_item_updates_snapshot_and_logs_history(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        $worksheet = Worksheet::factory()->create([
            'tenant_id' => $tenant->id,
            'created_by' => $user->id,
        ]);

        $item = $worksheet->items()->create([
            'exercise_id' => null,
            'position' => 1,
            'title' => 'Задание',
            'instructions' => ['старое'],
            'content_snapshot' => ['body' => 'старый'],
            'can_regenerate' => true,
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'content_snapshot' => ['body' => 'новый контент'],
            'instructions' => ['новое'],
        ];

        $this->postJson('/api/worksheets/'.$worksheet->id.'/items/'.$item->id.'/regenerate', $payload)
            ->assertOk()
            ->assertJsonPath('data.content_snapshot.body', 'новый контент')
            ->assertJsonPath('data.instructions.0', 'новое');

        $this->assertDatabaseHas('worksheet_items', [
            'id' => $item->id,
            'content_snapshot->body' => 'новый контент',
        ]);

        $this->assertDatabaseHas('worksheet_item_regenerations', [
            'worksheet_item_id' => $item->id,
        ]);
    }

    public function test_destroy_removes_worksheet_and_items(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        $worksheet = Worksheet::factory()->create([
            'tenant_id' => $tenant->id,
            'created_by' => $user->id,
        ]);

        $worksheet->items()->create([
            'exercise_id' => null,
            'position' => 1,
            'title' => 'Задание',
            'instructions' => [],
            'content_snapshot' => ['body' => 'контент'],
            'can_regenerate' => false,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson('/api/worksheets/'.$worksheet->id)->assertNoContent();

        $this->assertDatabaseMissing('worksheets', ['id' => $worksheet->id]);
        $this->assertDatabaseMissing('worksheet_items', ['worksheet_id' => $worksheet->id]);
    }
}
