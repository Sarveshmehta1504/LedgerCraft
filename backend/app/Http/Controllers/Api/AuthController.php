<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\SignupRequest;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('login_id', $request->validated('login_id'))->first();

        // One message for both cases - saying which half was wrong tells an
        // attacker which login ids exist.
        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            return $this->fail('Invalid Login Id or Password', 401);
        }

        return $this->ok('Login successful', [
            'user' => $this->userPayload($user),
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->ok('Logged out');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok('User fetched successfully', $this->userPayload($request->user()));
    }

    /**
     * Public self-registration. Always creates a portal `user` plus a linked
     * customer Contact, both in one transaction so a half-created account can
     * never exist.
     */
    public function signup(SignupRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            // Reuse an existing contact with this email rather than splitting
            // the customer's invoices across two records.
            $contact = Contact::where('email', $data['email'])->first()
                ?? Contact::create([
                    'name' => $data['name'],
                    'type' => 'customer',
                    'email' => $data['email'],
                ]);

            $user = User::create([
                'name' => $data['name'],
                'login_id' => $data['login_id'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'contact_id' => $contact->id,
            ]);

            // Role is assigned here, never taken from the request.
            $user->assignRole('user');

            return $user;
        });

        return $this->ok('Account created successfully', [
            'user' => $this->userPayload($user),
            'token' => $user->createToken('api')->plainTextToken,
        ], 201);
    }

    /**
     * Always reports success, whether or not the email exists.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            Password::sendResetLink($request->only('email'));
        } catch (Throwable $e) {
            // A transport failure must not change the response: if a rejected
            // recipient returned 500 while an unknown address returned 200,
            // the difference would reveal which accounts exist. Log it and
            // report the same thing either way.
            Log::error('Password reset mail failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return $this->ok('If the email exists, a reset link has been sent');
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // Any session opened with the old password is now invalid.
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return $this->fail('This password reset token is invalid or has expired', 422);
        }

        return $this->ok('Password reset successfully');
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'login_id' => $user->login_id,
            'email' => $user->email,
            'contact_id' => $user->contact_id,
            'role' => $user->getRoleNames()->first(),
        ];
    }
}
