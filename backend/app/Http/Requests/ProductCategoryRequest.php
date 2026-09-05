<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Must be an array, not the string 'sometimes|required': inside a rules
        // array each element is one whole rule name, so the piped form is
        // looked up as a single non-existent rule.
        $required = $this->isMethod('POST') ? ['required'] : ['sometimes', 'required'];
        $categoryId = $this->route('product_category')?->id;

        return [
            // Unique within a parent: "Chairs" may exist under two parents.
            'name' => [
                ...$required,
                'string',
                'max:255',
                Rule::unique('product_categories')
                    ->where(fn ($q) => $q->where('parent_id', $this->input('parent_id')))
                    ->ignore($categoryId),
            ],
            'parent_id' => ['nullable', 'exists:product_categories,id'],
        ];
    }
}
