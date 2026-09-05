<?php

namespace App\Rules;

use Illuminate\Validation\Rules\Password;

/**
 * The signup password policy from the design board, in one place so signup and
 * password reset can never drift apart: more than 8 characters, with a
 * lowercase letter, an uppercase letter and a special character.
 */
class StrongPassword
{
    public static function rules(): Password
    {
        return Password::min(9)->mixedCase()->symbols();
    }
}
