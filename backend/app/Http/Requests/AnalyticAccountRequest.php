<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\AnalyticAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticAccountRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return AnalyticAccount::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['analyticAccount'];
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];
        $id = $this->route('analyticAccount')?->id;

        return [
            'name' => [
                ...$required,
                'string',
                'max:255',
                Rule::unique('analytic_accounts', 'name')->ignore($id),
            ],
            'type' => [...$required, Rule::in(AnalyticAccount::TYPES)],
        ];
    }
}
