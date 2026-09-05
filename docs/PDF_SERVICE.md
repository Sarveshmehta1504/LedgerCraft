# PDF Service

How PDF generation (invoices, vendor bills, and reports) works across the
Laravel API and the Next.js frontend. This documents the endpoints already
defined in `API_DOCUMENTATION.md` → "Mail & Documents" — this file is the
implementation detail behind them, not a new contract.

---

## Why this approach

The backend is a pure JSON API (no server-rendered Blade views reach the
browser). A PDF endpoint therefore can't redirect or stream a view directly —
it must render the PDF server-side into bytes and return those bytes as a
binary HTTP response with the right headers. The frontend fetches that
response as a `Blob` and triggers a browser download/preview from it.

```text
Blade template
     ↓
barryvdh/laravel-dompdf renders to PDF bytes
     ↓
Controller returns response(bytes, 200, headers)
     ↓
Next.js fetch(..., { headers: Authorization }) → response.blob()
     ↓
Browser download link (URL.createObjectURL)
```

---

## Backend

### Package

```bash
composer require barryvdh/laravel-dompdf
```

Not currently in `composer.json` — add it when this feature is picked up.

### Endpoints (already specified in API_DOCUMENTATION.md)

* `GET /customer-invoices/{id}/pdf`
* `GET /vendor-bills/{id}/pdf`
* `GET /reports/{report}/pdf` — `report` ∈ `balance-sheet` | `profit-and-loss` | `budget`
* `POST /customer-invoices/{id}/send`, `POST /vendor-bills/{id}/send`, `POST /reports/{report}/send`
  — render the same PDF and email it synchronously instead of returning it

All routes live in `routes/api.php`, already prefixed `/api` and gated by
`auth:sanctum` + the relevant `role:` middleware per `API_DOCUMENTATION.md`.

### Controller pattern

One Blade template per document type (`resources/views/pdf/invoice.blade.php`,
`pdf/vendor-bill.blade.php`, `pdf/balance-sheet.blade.php`, etc.), rendered with
data assembled the same way the JSON endpoint for that resource already
assembles it (reuse the existing service/query, don't duplicate the
computation).

```php
namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;

class CustomerInvoicePdfController extends Controller
{
    public function download(int $id)
    {
        $invoice = /* fetch + authorize, same as the JSON show endpoint */;

        $pdf = Pdf::loadView('pdf.invoice', ['invoice' => $invoice]);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $invoice->invoice_number . '.pdf"',
            'Access-Control-Expose-Headers' => 'Content-Disposition',
        ]);
    }

    public function send(int $id, Request $request)
    {
        $invoice = /* fetch + authorize */;

        if (! $invoice->contact->email) {
            return response()->json(['code' => 422, 'message' => 'Contact has no email on file'], 422);
        }

        $pdf = Pdf::loadView('pdf.invoice', ['invoice' => $invoice]);

        try {
            // synchronous send — no ->queue(), no ShouldQueue, per BACKEND_REQUIREMENTS.md
            Mail::to($invoice->contact->email)->send(new InvoiceMail($invoice, $pdf->output()));
        } catch (\Throwable $e) {
            return response()->json(['code' => 500, 'message' => $e->getMessage()], 500);
        }

        return response()->json(['code' => 200, 'message' => "Invoice sent to {$invoice->contact->email}"]);
    }
}
```

### Rules carried over from BACKEND_REQUIREMENTS.md

* `send` endpoints send **synchronously** (`Mail::send`, never `->queue`); set a
  mail timeout so a dead SMTP host can't hang the request.
* `422` if the contact has no email; `500` with the real transport error if
  sending fails — never a false `200`.
* Reports accept the same query params (`as_of`, `from`/`to`, `budget_id`) as
  their JSON counterparts — the PDF route just renders what the JSON route
  would have returned.

### CORS

`Access-Context-Expose-Headers: Content-Disposition` must be present so the
frontend can read the filename off the response; add it in
`config/cors.php` (`exposed_headers`) as well as per-response, since some
browsers only honor the CORS-config value.

---

## Frontend

### Download flow (`GET .../pdf`)

```ts
async function downloadPdf(url: string, filename: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to generate PDF");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename; // fallback; server's Content-Disposition also names it
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
```

Call sites: an invoice/bill detail page's "Download PDF" button, and each
report page's "Print" button. Disable the button and show a spinner while the
request is in flight — same UX rule as the `send` endpoints, since PDF
rendering isn't instant either.

### Send flow (`POST .../send`)

Plain JSON POST, no blob handling — same `fetch` wrapper the rest of the app
already uses for mutations. Show the button as disabled/spinning until the
promise resolves (the request blocks for ~1s server-side), then toast the
`message` from the response (`"Invoice sent to nimesh@example.com"`) or the
error.

### Where this lives

* A small `lib/pdf.ts` (or equivalent) helper wrapping the download-blob logic
  above, reused by every "Download PDF" button instead of duplicating the
  blob/anchor dance per page.
* Existing invoice/bill/report pages call it — this is not a new page or
  route, just a button behavior on pages that already exist per
  `FRONTEND_REQUIREMENTS.md`.

---

## Scope note

This is a P1/polish item per `AGENTS.md`'s priority order (PDFs are listed
under Hour 8–11 differentiators in `TEAM_TASKS.md`) — implement it after the
core ledger and both flows (Purchase, Sales) are working end-to-end.
