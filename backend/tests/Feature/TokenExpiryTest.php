<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TokenExpiryTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        Role::findOrCreate('accountant', 'web');

        $user = User::factory()->create([
            'login_id' => 'tester01',
            // The User model casts password => 'hashed', so hashing here too
            // would double-hash it and every login would fail.
            'password' => 'Passw0rd@1',
        ]);
        $user->assignRole('accountant');

        return $user;
    }

    private function login(): array
    {
        $this->user();

        return $this->postJson('/api/auth/login', [
            'login_id' => 'tester01',
            'password' => 'Passw0rd@1',
        ])->json('data');
    }

    public function test_tokens_are_configured_to_expire(): void
    {
        $this->assertNotNull(
            config('sanctum.expiration'),
            'A token that never expires stays valid forever if leaked',
        );
    }

    public function test_login_reports_when_the_token_expires(): void
    {
        $data = $this->login();

        $this->assertSame(config('sanctum.expiration'), $data['expires_in_minutes']);
        $this->assertNotNull($data['expires_at']);
    }

    public function test_a_fresh_token_is_accepted(): void
    {
        $token = $this->login()['token'];

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk();
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $token = $this->login()['token'];

        $this->travel(config('sanctum.expiration') + 1)->minutes();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_refresh_issues_a_new_token(): void
    {
        $token = $this->login()['token'];

        $refreshed = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/refresh')
            ->assertOk()
            ->json('data');

        $this->assertNotSame($token, $refreshed['token']);

        $this->withHeader('Authorization', 'Bearer '.$refreshed['token'])
            ->getJson('/api/auth/me')
            ->assertOk();
    }

    public function test_refresh_revokes_the_old_token(): void
    {
        $token = $this->login()['token'];

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/refresh')
            ->assertOk();

        // The row is gone, so the token can never resolve again.
        $this->assertNull(PersonalAccessToken::findToken($token));

        // The guard caches the user it resolved earlier in this test process;
        // clear it so the next request genuinely re-authenticates.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_refresh_leaves_exactly_one_usable_token(): void
    {
        $user = $this->user();

        $token = $this->postJson('/api/auth/login', [
            'login_id' => 'tester01',
            'password' => 'Passw0rd@1',
        ])->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/auth/refresh')->assertOk();

        $this->assertSame(1, PersonalAccessToken::where('tokenable_id', $user->id)->count());
    }

    public function test_refresh_requires_a_valid_token(): void
    {
        $this->postJson('/api/auth/refresh')->assertStatus(401);
    }

    /**
     * An expired token cannot be exchanged - the user must log in again. Worth
     * pinning so nobody "fixes" refresh into a way around expiry.
     */
    public function test_an_expired_token_cannot_be_refreshed(): void
    {
        $token = $this->login()['token'];

        $this->travel(config('sanctum.expiration') + 1)->minutes();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/refresh')
            ->assertStatus(401);
    }
}
