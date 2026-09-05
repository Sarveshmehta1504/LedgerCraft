<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\SalesOrder;
use Illuminate\Foundation\Http\FormRequest;

class SalesOrderRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return SalesOrder::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['salesOrder'];
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
            // Sales-side only - the PS lists Tax on the Sales Order and omits
            // it from the Purchase Order.
            'lines.*.tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'lines.min' => 'A sales order needs at least one line.',
            'lines.*.quantity.gt' => 'Quantity must be greater than zero.',
        ];
    }
}
