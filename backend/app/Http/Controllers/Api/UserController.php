<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Users\AssignRoleRequest;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Admin-only user management. Every action is gated by UserPolicy; there is no
 * path here for an accountant or portal user.
 */
class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()
            ->with(['roles:id,name', 'contact:id,name,type,email'])
            ->when($request->query('role'), fn ($q, $role) => $q->whereHas(
                'roles', fn ($sub) => $sub->where('name', $role)
            ))
            ->when($request->query('deactivated') === 'only', fn ($q) => $q->deactivated())
            ->when($request->query('deactivated') === null, fn ($q) => $q->active())
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($sub) => $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('login_id', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
            ))
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->payload($user));

        return $this->ok('Users fetched successfully', $users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'login_id' => $data['login_id'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'contact_id' => $data['contact_id'] ?? null,
            ]);

            $user->syncRoles([$data['role']]);

            return $user;
        });

        return $this->ok('User created successfully', $this->payload($user), 201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return $this->ok('User fetched successfully', $this->payload($user));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $data = $request->validated();

        // Unlinking the contact of a portal user would leave it with nothing to
        // show, breaking the "every role-user account has exactly one contact"
        // invariant in docs/DB_SCHEMA.md.
        if (array_key_exists('contact_id', $data) && $data['contact_id'] === null && $user->hasRole('user')) {
            return $this->fail('A portal user must stay linked to a contact', 422);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
            // A password change invalidates every existing session.
            $user->tokens()->delete();
        }

        $user->update($data);

        return $this->ok('User updated successfully', $this->payload($user->fresh()));
    }

    /**
     * Role assignment is the whole point of this controller - it is the only
     * way an admin or accountant account can come into existence.
     */
    public function assignRole(AssignRoleRequest $request, User $user): JsonResponse
    {
        $this->authorize('assignRole', $user);

        $role = $request->validated('role');
        $contactId = $request->validated('contact_id') ?? $user->contact_id;

        if ($role === 'user' && $contactId === null) {
            return $this->fail('A portal user must be linked to a contact - pass contact_id', 422);
        }

        // Demoting yourself, or the last admin, locks the business out of its
        // own system. Blocked in both directions.
        if ($user->hasRole('admin') && $role !== 'admin') {
            if ($user->id === $request->user()->id) {
                return $this->fail('You cannot remove your own admin role', 422);
            }

            if ($this->adminCount() <= 1) {
                return $this->fail('Cannot demote the last remaining admin', 422);
            }
        }

        DB::transaction(function () use ($user, $role, $contactId) {
            $user->syncRoles([$role]);
            $user->contact_id = $role === 'user' ? $contactId : $user->contact_id;
            $user->save();
        });

        return $this->ok('Role updated successfully', $this->payload($user->fresh()));
    }

    /**
     * Deactivates rather than deletes. A user may be referenced by
     * journal_entries.created_by, so removing the row would break the audit
     * trail - and an account that posted ledger entries must stay resolvable
     * forever.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->isDeactivated()) {
            return $this->ok('User is already deactivated', $this->payload($user));
        }

        if ($user->hasRole('admin') && $this->adminCount() <= 1) {
            return $this->fail('Cannot deactivate the last remaining admin', 422);
        }

        DB::transaction(function () use ($user) {
            // Tokens go first so an in-flight session cannot outlive the account.
            $user->tokens()->delete();
            $user->deactivated_at = now();
            $user->save();
        });

        return $this->ok('User deactivated successfully', $this->payload($user->fresh()));
    }

    public function reactivate(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user->deactivated_at = null;
        $user->save();

        return $this->ok('User reactivated successfully', $this->payload($user->fresh()));
    }

    /** Deactivated admins cannot log in, so they do not count towards lockout. */
    private function adminCount(): int
    {
        return User::role('admin')->active()->count();
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'login_id' => $user->login_id,
            'email' => $user->email,
            'contact_id' => $user->contact_id,
            'contact' => $user->relationLoaded('contact') ? $user->contact : $user->contact()->first(),
            'role' => $user->getRoleNames()->first(),
            'deactivated_at' => $user->deactivated_at,
            'created_at' => $user->created_at,
        ];
    }
}
