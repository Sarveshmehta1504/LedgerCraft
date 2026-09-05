<?php

namespace App\Services;

use App\Mail\DocumentMail;
use App\Models\CustomerInvoice;
use App\Models\VendorBill;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

/**
 * Sends a rendered PDF to a contact.
 *
 * Sent synchronously - no ShouldQueue, no queue worker - so a success response
 * means the message really was handed to the transport rather than parked in a
 * queue nobody is draining.
 */
class DocumentMailService
{
    public function __construct(
        private readonly DocumentPdfService $pdf,
    ) {}

    public function sendInvoice(CustomerInvoice $invoice, ?string $to = null, ?string $subject = null): string
    {
        $invoice->loadMissing('contact');
        $recipient = $to ?? $invoice->contact?->email;

        $this->assertRecipient($recipient, 'customer');

        Mail::to($recipient)->send(new DocumentMail(
            subjectLine: $subject ?? 'Invoice '.$invoice->invoice_number.' from Urban Furniture',
            greetingName: $invoice->contact?->name ?? 'there',
            lines: [
                'Please find invoice '.$invoice->invoice_number.' attached.',
                'Amount due: '.number_format((float) $invoice->total, 2).'.',
            ],
            pdfName: $this->filename($invoice->invoice_number),
            pdfData: $this->pdf->invoice($invoice)->output(),
        ));

        return $recipient;
    }

    public function sendBill(VendorBill $bill, ?string $to = null, ?string $subject = null): string
    {
        $bill->loadMissing('contact');
        $recipient = $to ?? $bill->contact?->email;

        $this->assertRecipient($recipient, 'vendor');

        Mail::to($recipient)->send(new DocumentMail(
            subjectLine: $subject ?? 'Bill '.$bill->bill_number.' from Urban Furniture',
            greetingName: $bill->contact?->name ?? 'there',
            lines: [
                'Please find bill '.$bill->bill_number.' attached.',
                'Total: '.number_format((float) $bill->total, 2).'.',
            ],
            pdfName: $this->filename($bill->bill_number),
            pdfData: $this->pdf->bill($bill)->output(),
        ));

        return $recipient;
    }

    public function sendReport(string $report, string $to, ?string $subject, array $params = []): string
    {
        $title = ucwords(str_replace('-', ' ', $report));

        Mail::to($to)->send(new DocumentMail(
            subjectLine: $subject ?? $title.' — Urban Furniture',
            greetingName: 'there',
            lines: ['Please find the '.$title.' report attached.'],
            pdfName: $report.'.pdf',
            pdfData: $this->pdf->report($report, $params)->output(),
        ));

        return $to;
    }

    /**
     * A contact with no email is a data problem, not a server error - the UI
     * needs to point the user at the contact record.
     */
    private function assertRecipient(?string $recipient, string $party): void
    {
        if (blank($recipient)) {
            throw new RuntimeException(
                "This {$party} has no email address on file - add one, or pass an explicit recipient."
            );
        }
    }

    private function filename(string $number): string
    {
        return str_replace('/', '-', $number).'.pdf';
    }
}
