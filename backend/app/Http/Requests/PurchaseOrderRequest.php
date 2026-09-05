<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];

        return [
            'contact_id' => [...$required, 'exists:contacts,id'],
            'date' => [...$required, 'date'],
            // Payment terms: must not fall before the order itself.
            'due_date' => ['nullable', 'date', 'after_or_equal:date'],
            'lines' => [...$required, 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.account_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'lines.*.analytic_account_id' => ['nullable', 'exists:analytic_accounts,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'lines.min' => 'A purchase order needs at least one line.',
            'lines.*.quantity.gt' => 'Quantity must be greater than zero.',
        ];
    }
}
