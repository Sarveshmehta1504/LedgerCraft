<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PaymentRequest extends FormRequest
{
    /**
     * Three routes share this request, and they are not authorized alike.
     *
     * An accountant registering a payment is editing the document, so the
     * policy decides. A customer paying from the portal is not - the policy
     * would refuse them - so the check there is ownership, and it stays in
     * PortalController::assertOwned(), which answers 404 rather than 403 so
     * that probing cannot confirm another customer's invoice exists.
     *
     * Deciding by route parameter name rather than by role: /my/invoices/{invoice}
     * is the portal route whoever calls it, and the back-office routes bind
     * {vendorBill} or {customerInvoice}.
     */
    public function authorize(): bool
    {
        foreach (['vendorBill', 'customerInvoice'] as $parameter) {
            $document = $this->route($parameter);

            if ($document instanceof Model) {
                return (bool) $this->user()?->can('update', $document);
            }
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0'],
            // Defaults to bank, per the design board.
            'payment_via' => ['nullable', Rule::in(['bank', 'cash'])],
            'date' => ['nullable', 'date'],
            'reference' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
