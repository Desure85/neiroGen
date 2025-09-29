<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\ExerciseTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    private function seedTenants(): void
    {
        DB::table('tenants')->insert([
            ['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1'],
            ['id' => 2, 'name' => 'Tenant 2', 'slug' => 'tenant-2'],
        ]);
    }

    private function makeTemplate(?int $tenantId = null, ?int $creatorId = null): ExerciseTemplate
    {
        return ExerciseTemplate::create([
            'name' => 'Tpl',
            'description' => null,
            'type' => 'speech',
            'content' => ['k' => 'v'],
            'tenant_id' => $tenantId,
            'created_by' => $creatorId,
        ]);
    }

    public function test_admin_can_create_assignment_and_set_tenant(): void
    {
        $this->seedTenants();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);
        $tpl = $this->makeTemplate(null, $admin->id);

        Sanctum::actingAs($admin);

        $payload = [
            'exercise_template_id' => $tpl->id,
            'status' => 'pending',
            'tenant_id' => 2,
            'due_date' => now()->addDay()->toDateString(),
        ];

        $res = $this->postJson('/api/assignments', $payload)->assertCreated();
        $res->assertJsonPath('data.tenant_id', 2);
        $res->assertJsonPath('data.exercise_template_id', $tpl->id);
    }

    public function test_teacher_creation_scoped_to_own_tenant(): void
    {
        $this->seedTenants();
        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);
        $tpl = $this->makeTemplate(1, $teacher->id);

        Sanctum::actingAs($teacher);

        $payload = [
            'exercise_template_id' => $tpl->id,
            'status' => 'in_progress',
            'tenant_id' => 2, // should be ignored
        ];

        $res = $this->postJson('/api/assignments', $payload)->assertCreated();
        $res->assertJsonPath('data.tenant_id', 1);
        $res->assertJsonPath('data.status', 'in_progress');
    }

    public function test_teacher_cannot_view_or_modify_other_tenant_assignment(): void
    {
        $this->seedTenants();
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);
        $tpl = $this->makeTemplate(null, $admin->id);
        $foreign = Assignment::create([
            'exercise_template_id' => $tpl->id,
            'tenant_id' => 2,
            'status' => 'pending',
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

        $this->getJson('/api/assignments/'.$foreign->id)->assertStatus(403);
        $this->putJson('/api/assignments/'.$foreign->id, ['status' => 'completed'])->assertStatus(403);
        $this->deleteJson('/api/assignments/'.$foreign->id)->assertStatus(403);
    }

    public function test_index_filters_by_tenant_and_status(): void
    {
        $this->seedTenants();
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);
        $tpl = $this->makeTemplate(null, $admin->id);

        // Tenant 1 assignments
        Assignment::create(['exercise_template_id' => $tpl->id, 'tenant_id' => 1, 'status' => 'pending']);
        Assignment::create(['exercise_template_id' => $tpl->id, 'tenant_id' => 1, 'status' => 'completed']);
        // Tenant 2 assignments
        Assignment::create(['exercise_template_id' => $tpl->id, 'tenant_id' => 2, 'status' => 'pending']);

        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);
        Sanctum::actingAs($teacher);

        // Teacher sees only tenant 1
        $res = $this->getJson('/api/assignments')->assertOk();
        $tenantIds = collect($res->json('data'))->pluck('tenant_id')->unique()->values()->all();
        $this->assertSame([1], $tenantIds);

        // Filter by status
        $res2 = $this->getJson('/api/assignments?status=completed')->assertOk();
        $statuses = collect($res2->json('data'))->pluck('status')->unique()->values()->all();
        $this->assertSame(['completed'], $statuses);
    }
}
