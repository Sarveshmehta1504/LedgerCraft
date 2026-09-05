<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        return $user instanceof User && (bool) $this->user()?->can('assignRole', $user);
    }

    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(['admin', 'accountant', 'user'])],
            'contact_id' => ['nullable', 'exists:contacts,id'],
        ];
    }
}
