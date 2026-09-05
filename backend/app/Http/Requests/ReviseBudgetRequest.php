<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviseBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Everything is optional: a revision inherits the original's values unless
     * overridden, and usually only the committed amount changes.
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'analytic_account_id' => ['nullable', 'exists:analytic_accounts,id'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date', 'after_or_equal:period_start'],
            'committed_amount' => ['nullable', 'numeric', 'min:0'],
            'responsible_id' => ['nullable', 'exists:contacts,id'],
        ];
    }
}
