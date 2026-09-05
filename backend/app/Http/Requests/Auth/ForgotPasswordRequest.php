<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Accepts either identifier. Login is by login_id, so a user who has just
     * failed to sign in has that to hand, not necessarily their email address.
     *
     * Deliberately no `exists` rule on either field: the response must be
     * identical whether or not the account exists, otherwise this endpoint
     * enumerates accounts.
     */
    public function rules(): array
    {
        return [
            'email' => ['nullable', 'required_without:login_id', 'email'],
            'login_id' => ['nullable', 'required_without:email', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->filled('email') && $this->filled('login_id')) {
                $validator->errors()->add('login_id', 'Send either login_id or email, not both.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'email.required_without' => 'Provide either a login id or an email address.',
            'login_id.required_without' => 'Provide either a login id or an email address.',
        ];
    }
}
