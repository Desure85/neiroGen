<?php

namespace Tests\Feature;

use App\Models\ExerciseTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExerciseTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_global_template(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
            'tenant_id' => null,
        ]);

        Sanctum::actingAs($admin);

        $payload = [
            'name' => 'Articulation Practice',
            'description' => 'Global articulation template',
            'type' => 'articulation',
            'content' => ['difficulty' => 'easy'],
            'global' => true,
        ];

        $resp = $this->postJson('/api/templates', $payload)
            ->assertCreated();

        $this->assertNull($resp->json('data.tenant_id'));
        $this->assertSame('articulation', $resp->json('data.type'));
    }

    public function test_teacher_creation_is_scoped_to_own_tenant(): void
    {
        DB::table('tenants')->insert(['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        Sanctum::actingAs($teacher);

        $payload = [
            'name' => 'Pronunciation Set',
            'description' => null,
            'type' => 'pronunciation',
            'content' => ['letters' => ['r','l']],
            'global' => true, // should be ignored for non-admin
        ];

        $resp = $this->postJson('/api/templates', $payload)
            ->assertCreated();

        $this->assertSame(1, $resp->json('data.tenant_id'));
    }

    public function test_teacher_cannot_update_global_template(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);

        $global = ExerciseTemplate::create([
            'name' => 'Global Tpl',
            'description' => null,
            'type' => 'speech',
            'content' => ['a' => 1],
            'tenant_id' => null,
            'created_by' => $admin->id,
        ]);

        DB::table('tenants')->insert(['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        Sanctum::actingAs($teacher);

        $this->putJson('/api/templates/'.$global->id, ['name' => 'New Name'])
            ->assertStatus(403);
    }

    public function test_index_filters_by_tenant_for_teacher(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);

        DB::table('tenants')->insert([
            ['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1'],
            ['id' => 2, 'name' => 'Tenant 2', 'slug' => 'tenant-2'],
        ]);

        // global
        ExerciseTemplate::create([
            'name' => 'Global',
            'description' => null,
            'type' => 'speech',
            'content' => ['g' => true],
            'tenant_id' => null,
            'created_by' => $admin->id,
        ]);
        // tenant 1
        ExerciseTemplate::create([
            'name' => 'Tenant1',
            'description' => null,
            'type' => 'speech',
            'content' => ['t1' => true],
            'tenant_id' => 1,
            'created_by' => $admin->id,
        ]);
        // tenant 2
        ExerciseTemplate::create([
            'name' => 'Tenant2',
            'description' => null,
            'type' => 'speech',
            'content' => ['t2' => true],
            'tenant_id' => 2,
            'created_by' => $admin->id,
        ]);

        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);
        Sanctum::actingAs($teacher);

        $res = $this->getJson('/api/templates')->assertOk();
        $names = collect($res->json('data'))->pluck('name')->all();

        $this->assertContains('Global', $names);
        $this->assertContains('Tenant1', $names);
        $this->assertNotContains('Tenant2', $names);
    }

    public function test_index_pagination_meta_is_present(): void
    {
        // Seed >20 templates to trigger pagination (default page size 20)
        for ($i = 1; $i <= 25; $i++) {
            ExerciseTemplate::create([
                'name' => 'Tpl '.$i,
                'description' => null,
                'type' => 'speech',
                'content' => ['i' => $i],
                'tenant_id' => null,
            ]);
        }

        // Page 1
        $res1 = $this->getJson('/api/templates')->assertOk();
        $res1->assertJsonStructure([
            'data',
            'links' => ['first','last','prev','next'],
            'meta' => ['current_page','last_page','per_page','total']
        ]);
        $this->assertSame(1, $res1->json('meta.current_page'));
        $this->assertSame(20, $res1->json('meta.per_page'));
        $this->assertGreaterThanOrEqual(25, $res1->json('meta.total'));
        $this->assertCount(20, $res1->json('data'));

        // Ensure there is a next page link
        $this->assertNotNull($res1->json('links.next'));
    }
}
