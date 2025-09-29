<?php

namespace Tests\Feature;

use App\Jobs\GenerateAssignmentIllustrationJob;
use App\Models\Assignment;
use App\Models\ExerciseTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssignmentIllustrationTest extends TestCase
{
    use RefreshDatabase;

    private function seedTenants(): void
    {
        DB::table('tenants')->insert([
            ['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1'],
            ['id' => 2, 'name' => 'Tenant 2', 'slug' => 'tenant-2'],
        ]);
    }

    public function test_teacher_can_queue_illustration_generation_for_own_assignment(): void
    {
        $this->seedTenants();

        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher-ilu@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        $tpl = ExerciseTemplate::create([
            'name' => 'Tpl',
            'description' => null,
            'type' => 'speech',
            'content' => ['k' => 'v'],
            'tenant_id' => 1,
            'created_by' => $teacher->id,
        ]);
        $assn = Assignment::create([
            'exercise_template_id' => $tpl->id,
            'tenant_id' => 1,
            'status' => 'pending',
            'created_by' => $teacher->id,
        ]);

        Sanctum::actingAs($teacher);
        Bus::fake();

        $this->postJson('/api/assignments/'.$assn->id.'/illustration', [
            'prompt' => 'Cartoon image of a cat pronouncing "R"',
            'seed' => 42,
        ])->assertAccepted()->assertJson(['queued' => true]);

        Bus::assertDispatched(GenerateAssignmentIllustrationJob::class, function ($job) use ($assn) {
            return $job->assignmentId === $assn->id
                && ($job->payload['prompt'] ?? null) === 'Cartoon image of a cat pronouncing "R"';
        });
    }

    public function test_teacher_cannot_queue_for_other_tenant_assignment(): void
    {
        $this->seedTenants();

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin-ilu@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'admin',
        ]);

        $tpl = ExerciseTemplate::create([
            'name' => 'Tpl',
            'description' => null,
            'type' => 'speech',
            'content' => ['k' => 'v'],
            'tenant_id' => 2,
            'created_by' => $admin->id,
        ]);
        $assn = Assignment::create([
            'exercise_template_id' => $tpl->id,
            'tenant_id' => 2,
            'status' => 'pending',
            'created_by' => $admin->id,
        ]);

        $teacher = User::create([
            'name' => 'Teacher',
            'email' => 'teacher2-ilu@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        Sanctum::actingAs($teacher);
        $this->postJson('/api/assignments/'.$assn->id.'/illustration', [
            'prompt' => 'Other tenant test',
        ])->assertStatus(403);
    }
}
