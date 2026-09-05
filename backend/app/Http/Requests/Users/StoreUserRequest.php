<?php

namespace App\Http\Requests\Users;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'login_id' => ['required', 'string', 'min:6', 'max:12', 'alpha_dash', 'unique:users,login_id'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', StrongPassword::rules()],
            // Unlike signup, an Admin chooses the role explicitly.
            'role' => ['required', Rule::in(['admin', 'accountant', 'user'])],
            // A portal user is meaningless without the contact whose invoices
            // it can see, so the link is mandatory for that role only.
            'contact_id' => [
                Rule::requiredIf(fn () => $this->input('role') === 'user'),
                'nullable',
                'exists:contacts,id',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_id.required' => 'A portal user must be linked to a contact.',
            'login_id.min' => 'The login id must be between 6 and 12 characters.',
            'login_id.max' => 'The login id must be between 6 and 12 characters.',
        ];
    }
}
