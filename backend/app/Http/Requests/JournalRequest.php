<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\Journal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JournalRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return Journal::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['journal'];
    }

    public function rules(): array
    {
        // Must be an array, not the string 'sometimes|required': inside a rules
        // array each element is one whole rule name, so the piped form is
        // looked up as a single non-existent rule.
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'type' => [...$required, Rule::in(Journal::TYPES)],
            // Both defaults are optional, but must point at real accounts.
            'default_debit_account' => ['nullable', 'exists:chart_of_accounts,id'],
            'default_credit_account' => ['nullable', 'exists:chart_of_accounts,id'],
        ];
    }
}
