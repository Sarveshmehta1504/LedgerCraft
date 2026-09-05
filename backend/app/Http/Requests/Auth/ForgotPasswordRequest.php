<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Deliberately no `exists` rule - the response must be identical whether or
     * not the account exists, otherwise this endpoint enumerates accounts.
     */
    public function rules(): array
    {
        return ['email' => ['required', 'email']];
    }
}
