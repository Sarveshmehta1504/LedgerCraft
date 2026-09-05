<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesResource;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    use AuthorizesResource;

    protected function resourceModel(): string
    {
        return Product::class;
    }

    /** @return array<int, string> */
    protected function routeParameters(): array
    {
        return ['product'];
    }

    public function rules(): array
    {
        // Must be an array, not the string 'sometimes|required': inside a rules
        // array each element is one whole rule name, so the piped form is
        // looked up as a single non-existent rule.
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'type' => [...$required, Rule::in(['goods', 'service', 'combo'])],
            'sales_price' => ['nullable', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            // Category is mandatory - a product cannot exist without one.
            'category_id' => [...$required, 'exists:product_categories,id'],
        ];
    }
}
