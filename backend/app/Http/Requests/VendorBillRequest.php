<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\VendorBill;
use Illuminate\Foundation\Http\FormRequest;

class VendorBillRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return VendorBill::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['vendorBill'];
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];

        return [
            'contact_id' => [...$required, 'exists:contacts,id'],
            'bill_date' => [...$required, 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:bill_date'],
            'bill_reference' => ['nullable', 'string', 'max:255'],
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'lines' => [...$required, 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'exists:products,id'],
            'lines.*.account_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'lines.*.analytic_account_id' => ['nullable', 'exists:analytic_accounts,id'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
