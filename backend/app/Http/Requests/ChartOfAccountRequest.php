<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChartOfAccountRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return ChartOfAccount::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['account'];
    }

    public function rules(): array
    {
        // Must be an array, not the string 'sometimes|required': inside a rules
        // array each element is one whole rule name, so the piped form is
        // looked up as a single non-existent rule.
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];
        $accountId = $this->route('account')?->id;

        return [
            'code' => [
                ...$required,
                'string',
                'max:20',
                Rule::unique('chart_of_accounts', 'code')->ignore($accountId),
            ],
            'name' => [...$required, 'string', 'max:255'],
            'type' => [...$required, Rule::in(ChartOfAccount::TYPES)],
        ];
    }
}
