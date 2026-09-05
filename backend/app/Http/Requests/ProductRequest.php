<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes|required';

        return [
            'name' => [$required, 'string', 'max:255'],
            'type' => [$required, Rule::in(['goods', 'service', 'combo'])],
            'sales_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            // Category is mandatory - a product cannot exist without one.
            'category_id' => [$required, 'exists:product_categories,id'],
        ];
    }
}
