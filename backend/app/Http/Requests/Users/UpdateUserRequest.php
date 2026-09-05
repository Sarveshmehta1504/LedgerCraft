<?php

namespace App\Http\Requests\Users;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'login_id' => [
                'sometimes', 'required', 'string', 'min:6', 'max:12', 'alpha_dash',
                Rule::unique('users', 'login_id')->ignore($userId),
            ],
            'email' => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => ['sometimes', 'required', StrongPassword::rules()],
            'contact_id' => ['sometimes', 'nullable', 'exists:contacts,id'],
        ];
    }
}
