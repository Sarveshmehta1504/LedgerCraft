<?php

namespace Tests\Feature;

use App\Mail\DocumentMail;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\CustomerInvoice;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use App\Models\VendorBill;
use App\Services\DocumentMailService;
use App\Services\DocumentPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Mail is faked here on purpose: the suite runs constantly and the mail plan
 * has a hard message cap. Real delivery is verified by a handful of deliberate
 * manual sends, not by the test runner.
 */
class DocumentPdfMailTest extends TestCase
{
    use RefreshDatabase;

    private Contact $contact;

    private Product $product;

    private ChartOfAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->contact = Contact::create([
            'name' => 'Nimesh Pathak',
            'type' => 'both',
            'email' => 'nimesh@example.com',
        ]);
        $this->account = ChartOfAccount::create(['code' => '4000', 'name' => 'Sale Income', 'type' => 'income']);
        $category = ProductCategory::create(['name' => 'Furniture', 'parent_id' => null]);
        $this->product = Product::create([
            'name' => 'Wooden Chair', 'type' => 'goods',
            'sales_price' => 2500, 'cost_price' => 2000, 'category_id' => $category->id,
        ]);
    }

    private function invoice(?string $email = 'nimesh@example.com'): CustomerInvoice
    {
        $contact = $email === $this->contact->email
            ? $this->contact
            : Contact::create(['name' => 'No Email Co', 'type' => 'customer', 'email' => $email]);

        $invoice = CustomerInvoice::create([
            'invoice_number' => 'INV/2026/'.uniqid(),
            'contact_id' => $contact->id,
            'invoice_date' => '2026-09-01',
            'status' => 'posted',
            'total' => '14750.00',
        ]);

        $invoice->lines()->create([
            'product_id' => $this->product->id,
            'account_id' => $this->account->id,
            'quantity' => 5, 'unit_price' => 2500, 'tax_percent' => 18, 'subtotal' => 12500,
        ]);

        return $invoice->fresh();
    }

    private function bill(): VendorBill
    {
        $bill = VendorBill::create([
            'bill_number' => 'Bill/2026/'.uniqid(),
            'contact_id' => $this->contact->id,
            'bill_date' => '2026-09-01',
            'status' => 'posted',
            'total' => '10000.00',
        ]);

        $bill->lines()->create([
            'product_id' => $this->product->id,
            'account_id' => $this->account->id,
            'quantity' => 5, 'unit_price' => 2000, 'subtotal' => 10000,
        ]);

        return $bill->fresh();
    }

    private function admin(): User
    {
        Role::findOrCreate('admin', 'web');
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    public function test_invoice_pdf_is_a_real_pdf(): void
    {
        $output = app(DocumentPdfService::class)->invoice($this->invoice())->output();

        $this->assertStringStartsWith('%PDF-', $output);
        $this->assertGreaterThan(1000, strlen($output));
    }

    public function test_bill_pdf_is_a_real_pdf(): void
    {
        $output = app(DocumentPdfService::class)->bill($this->bill())->output();

        $this->assertStringStartsWith('%PDF-', $output);
    }

    public function test_every_report_renders_to_pdf(): void
    {
        $pdf = app(DocumentPdfService::class);

        foreach (['balance-sheet', 'profit-and-loss', 'budget'] as $report) {
            $this->assertStringStartsWith('%PDF-', $pdf->report($report)->output(), $report.' failed');
        }
    }

    public function test_an_unknown_report_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        app(DocumentPdfService::class)->report('not-a-report');
    }

    public function test_sending_an_invoice_attaches_the_pdf(): void
    {
        $invoice = $this->invoice();

        app(DocumentMailService::class)->sendInvoice($invoice);

        Mail::assertSent(DocumentMail::class, function (DocumentMail $mail) use ($invoice) {
            $attachments = $mail->attachments();

            return $mail->hasTo('nimesh@example.com')
                && count($attachments) === 1
                && str_contains($mail->envelope()->subject, $invoice->invoice_number);
        });
    }

    public function test_sending_falls_back_to_the_contact_email(): void
    {
        app(DocumentMailService::class)->sendBill($this->bill());

        Mail::assertSent(DocumentMail::class, fn (DocumentMail $mail) => $mail->hasTo('nimesh@example.com'));
    }

    public function test_an_explicit_recipient_overrides_the_contact(): void
    {
        app(DocumentMailService::class)->sendInvoice($this->invoice(), 'someone.else@example.com');

        Mail::assertSent(DocumentMail::class, fn (DocumentMail $mail) => $mail->hasTo('someone.else@example.com'));
    }

    public function test_a_contact_without_an_email_is_rejected(): void
    {
        $this->expectException(RuntimeException::class);

        app(DocumentMailService::class)->sendInvoice($this->invoice(null));
    }

    public function test_a_contact_without_an_email_returns_422_not_500(): void
    {
        $invoice = $this->invoice(null);

        $this->actingAs($this->admin())
            ->postJson("/api/customer-invoices/{$invoice->id}/send")
            ->assertStatus(422);

        Mail::assertNothingSent();
    }

    public function test_the_send_endpoint_reports_the_recipient(): void
    {
        $invoice = $this->invoice();

        $this->actingAs($this->admin())
            ->postJson("/api/customer-invoices/{$invoice->id}/send")
            ->assertOk()
            ->assertJsonPath('message', 'Invoice sent to nimesh@example.com');
    }

    public function test_a_report_send_requires_a_recipient(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/reports/balance-sheet/send')
            ->assertStatus(422);

        Mail::assertNothingSent();
    }

    public function test_a_report_can_be_sent_to_an_explicit_address(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/reports/profit-and-loss/send', ['to' => 'owner@example.com'])
            ->assertOk();

        Mail::assertSent(DocumentMail::class, fn (DocumentMail $mail) => $mail->hasTo('owner@example.com'));
    }

    public function test_pdf_download_returns_a_pdf_response(): void
    {
        $invoice = $this->invoice();

        $response = $this->actingAs($this->admin())->get("/api/customer-invoices/{$invoice->id}/pdf");

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_an_unknown_report_pdf_is_404(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/reports/nonsense/pdf')
            ->assertStatus(404);
    }
}
