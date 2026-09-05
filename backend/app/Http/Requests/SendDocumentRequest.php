<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `to` is optional for documents - it falls back to the contact's own
     * address - but required for reports, which have no contact.
     */
    public function rules(): array
    {
        return [
            'to' => ['nullable', 'email'],
            'subject' => ['nullable', 'string', 'max:255'],
        ];
    }
}
