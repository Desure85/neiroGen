<?php

namespace Tests\Feature;

use App\Jobs\GenerateWorksheetJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorksheetAsyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_async_dispatches_job(): void
    {
        DB::table('tenants')->insert(['id' => 1, 'name' => 'Tenant 1', 'slug' => 'tenant-1']);
        $user = User::create([
            'name' => 'Teacher',
            'email' => 'teacher@example.com',
            'password' => bcrypt('secret1234'),
            'role' => 'teacher',
            'tenant_id' => 1,
        ]);

        Bus::fake();
        Sanctum::actingAs($user);

        $payload = [
            'exercise_ids' => [1, 2, 3],
            'format' => 'A4',
            'copies' => 2,
        ];

        $this->postJson('/api/worksheets/generate-async', $payload)
            ->assertStatus(202)
            ->assertJson([
                'queued' => true,
                'format' => 'A4',
                'copies' => 2,
            ]);

        Bus::assertDispatched(GenerateWorksheetJob::class, function (GenerateWorksheetJob $job) {
            return $job->exerciseIds === [1, 2, 3]
                && strtoupper($job->format) === 'A4'
                && $job->copies === 2;
        });
    }
}
