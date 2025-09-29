<?php

namespace Tests\Feature;

use App\Models\ContentBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContentBlockPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function seedTenants(): void
    {
        DB::table('tenants')->insert([
            ['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1'],
            ['id' => 2, 'name' => 'Tenant 2', 'slug' => 'tenant-2'],
        ]);
    }

    private function makeBlock(int $tenantId, int $creatorId, array $overrides = []): ContentBlock
    {
        return ContentBlock::create(array_merge([
            'type' => 'text',
            'title' => 'Sample block',
            'content' => ['text' => 'hello'],
            'metadata' => [],
            'settings' => [],
            'is_template' => false,
            'tenant_id' => $tenantId,
            'created_by' => $creatorId,
        ], $overrides));
    }

    public function test_teacher_cannot_view_other_tenant_block(): void
    {
        $this->seedTenants();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);
        $foreignBlock = $this->makeBlock(2, $admin->id);

        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        Sanctum::actingAs($teacher);

        $this->getJson('/api/content-blocks/'.$foreignBlock->id)->assertStatus(403);
    }

    public function test_teacher_can_crud_within_tenant(): void
    {
        $this->seedTenants();
        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);
        Sanctum::actingAs($teacher);

        $payload = [
            'type' => 'text',
            'title' => 'My block',
            'content' => ['text' => 'Hello'],
        ];

        $create = $this->postJson('/api/content-blocks', $payload)->assertCreated();
        $blockId = $create->json('id');

        $this->putJson('/api/content-blocks/'.$blockId, [
            'type' => 'text',
            'title' => 'Updated',
            'content' => ['text' => 'Updated'],
            'metadata' => [],
            'settings' => [],
        ])->assertOk()->assertJsonPath('title', 'Updated');

        tap($this->deleteJson('/api/content-blocks/'.$blockId))->assertNoContent();
    }

    public function test_admin_can_manage_any_block(): void
    {
        $this->seedTenants();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);
        $block = $this->makeBlock(2, $admin->id);

        Sanctum::actingAs($admin);

        $this->putJson('/api/content-blocks/'.$block->id, [
            'type' => 'text',
            'title' => 'Admin updated',
            'content' => ['text' => 'Admin updated'],
            'metadata' => [],
            'settings' => [],
        ])->assertOk()->assertJsonPath('title', 'Admin updated');
        tap($this->deleteJson('/api/content-blocks/'.$block->id))->assertNoContent();
    }
}
