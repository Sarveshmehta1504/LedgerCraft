<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'analytic_account_id' => [...$required, 'exists:analytic_accounts,id'],
            'period_start' => [...$required, 'date'],
            'period_end' => [...$required, 'date', 'after_or_equal:period_start'],
            'committed_amount' => [...$required, 'numeric', 'min:0'],
            'responsible_id' => [...$required, 'exists:contacts,id'],
        ];
    }
}
