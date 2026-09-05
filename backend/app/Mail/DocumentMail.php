<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * One Mailable for invoices, bills and reports - they differ only by subject,
 * body copy and the attached PDF.
 *
 * Deliberately NOT ShouldQueue: mail is sent synchronously so a 200 means the
 * message really reached the transport, and no queue worker is needed for the
 * demo.
 */
class DocumentMail extends Mailable
{
    public function __construct(
        private readonly string $subjectLine,
        private readonly string $greetingName,
        private readonly array $lines,
        private readonly string $pdfName,
        private readonly string $pdfData,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.document',
            with: [
                'greetingName' => $this->greetingName,
                'lines' => $this->lines,
            ],
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfData, $this->pdfName)
                ->withMime('application/pdf'),
        ];
    }
}
