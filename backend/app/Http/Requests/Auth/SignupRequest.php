<?php

namespace App\Http\Requests\Auth;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

class SignupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Note there is no `role` rule on purpose - public signup always creates a
     * portal `user`, and the role is set server-side in the controller. A role
     * sent in the payload is ignored, never trusted.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'login_id' => ['required', 'string', 'min:6', 'max:12', 'alpha_dash', 'unique:users,login_id'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', StrongPassword::rules()],
        ];
    }

    public function messages(): array
    {
        return [
            'login_id.min' => 'The login id must be between 6 and 12 characters.',
            'login_id.max' => 'The login id must be between 6 and 12 characters.',
        ];
    }
}
