<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_comfy_health_ok(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);

        config()->set('services.comfyui.url', 'http://fake-comfy.test');
        Http::preventStrayRequests();
        Http::fake([
            'http://fake-comfy.test/' => Http::response(['ok' => true], 200),
        ]);

        $this->getJson('/api/integration/comfy/health')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_comfy_health_unavailable(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($user);

        config()->set('services.comfyui.url', 'http://fake-comfy.test');
        Http::preventStrayRequests();
        Http::fake([
            'http://fake-comfy.test/' => Http::response('bad', 500),
        ]);

        $this->getJson('/api/integration/comfy/health')
            ->assertStatus(503)
            ->assertJson(['ok' => false]);
    }
}
