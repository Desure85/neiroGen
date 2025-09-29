<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_sets_session_cookie_and_returns_user(): void
    {
        $payload = [
            'name' => 'Tester',
            'email' => 'tester@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertCreated();
        $response->assertJsonStructure([
            'message',
            'user' => ['id', 'name', 'email'],
        ]);
        $response->assertCookieNotExpired(config('session.cookie'));

        $this->assertAuthenticated();
        $this->assertAuthenticatedAs(User::where('email', 'tester@example.com')->first());
    }

    public function test_spa_login_me_and_logout_flow(): void
    {
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('secret1234'),
        ]);

        // Sanctum expects the CSRF cookie to be retrieved before POST requests in SPA flow
        $this->get('/sanctum/csrf-cookie')->assertNoContent();

        $login = $this->postJson('/api/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'secret1234',
        ]);

        $login->assertOk();
        $login->assertJsonStructure([
            'message',
            'user' => ['id', 'name', 'email'],
        ]);
        tap($login)->assertCookieNotExpired(config('session.cookie'));
        $this->assertNull($login->getCookie('XSRF-TOKEN'));

        $this->assertAuthenticatedAs($user);

        $me = $this->getJson('/api/auth/me')->assertOk();
        $this->assertSame('admin@example.com', $me->json('email'));

        $logout = $this->postJson('/api/auth/logout')->assertOk();
        $logout->assertJson(['message' => 'Logged out']);
        tap($logout)->assertCookieExpired(config('session.cookie'));

        $this->getJson('/api/auth/me')->assertUnauthorized();
    }
}
