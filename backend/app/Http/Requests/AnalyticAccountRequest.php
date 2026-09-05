<?php

namespace App\Http\Requests;

use App\Models\AnalyticAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
