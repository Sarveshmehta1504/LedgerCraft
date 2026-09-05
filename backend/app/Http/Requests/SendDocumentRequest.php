<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;

class SendDocumentRequest extends FormRequest
{
    /**
     * Mailing a bill or an invoice is authorized against that document; mailing
     * a report has no document to check, so it falls back to the same roles
     * ReportController allows through.
     */
    public function authorize(): bool
    {
        foreach (['vendorBill', 'customerInvoice'] as $parameter) {
            $document = $this->route($parameter);

            if ($document instanceof Model) {
                return (bool) $this->user()?->can('update', $document);
            }
        }

        return (bool) $this->user()?->hasAnyRole(['admin', 'accountant']);
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
