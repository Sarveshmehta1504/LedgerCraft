<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\CustomerInvoice;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Public signup must never inherit an existing contact.
 *
 * A contact's email is data an admin typed in, not proof that the person
 * signing up controls that mailbox. Matching on it allowed account takeover:
 * anyone who knew a customer's email could register and read - and pay against
 * - that customer's invoices.
 */
class SignupContactIsolationTest extends TestCase
{
    use RefreshDatabase;

    private const EMAIL = 'rahul.sharma@example.com';

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('user', 'web');
    }

    private function existingCustomerWithInvoice(): Contact
    {
        $contact = Contact::create([
            'name' => 'Rahul Sharma',
            'type' => 'customer',
            'email' => self::EMAIL,
        ]);

        $account = ChartOfAccount::create(['code' => '4000', 'name' => 'Sale Income', 'type' => 'income']);
        $category = ProductCategory::create(['name' => 'Furniture', 'parent_id' => null]);
        $product = Product::create([
            'name' => 'Sofa', 'type' => 'goods', 'sales_price' => 50000,
            'cost_price' => 30000, 'category_id' => $category->id,
        ]);

        $invoice = CustomerInvoice::create([
            'invoice_number' => 'INV/2026/0001',
            'contact_id' => $contact->id,
            'invoice_date' => '2026-09-01',
            'status' => 'posted',
            'total' => '59000.00',
        ]);
        $invoice->lines()->create([
            'product_id' => $product->id,
            'account_id' => $account->id,
            'quantity' => 1, 'unit_price' => 50000, 'tax_percent' => 18, 'subtotal' => 50000,
        ]);

        return $contact;
    }

    private function signUp(string $email, string $loginId = 'stranger1'): array
    {
        return $this->postJson('/api/auth/signup', [
            'name' => 'Totally Different Person',
            'login_id' => $loginId,
            'email' => $email,
            'password' => 'Passw0rd@1',
            'password_confirmation' => 'Passw0rd@1',
        ])->json();
    }

    public function test_signup_does_not_adopt_a_contact_with_the_same_email(): void
    {
        $existing = $this->existingCustomerWithInvoice();

        $response = $this->signUp(self::EMAIL);
        $newContactId = $response['data']['user']['contact_id'];

        $this->assertNotSame(
            $existing->id,
            $newContactId,
            'signup must not inherit an existing customer by email - that is account takeover',
        );
    }

    public function test_the_new_account_sees_none_of_the_existing_customers_invoices(): void
    {
        $this->existingCustomerWithInvoice();
        $this->signUp(self::EMAIL);

        $user = User::where('login_id', 'stranger1')->first();

        $this->actingAs($user)
            ->getJson('/api/my/invoices')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_the_new_account_cannot_pay_the_existing_customers_invoice(): void
    {
        $this->existingCustomerWithInvoice();
        $this->signUp(self::EMAIL);

        $user = User::where('login_id', 'stranger1')->first();
        $invoice = CustomerInvoice::first();

        $this->actingAs($user)
            ->postJson("/api/my/invoices/{$invoice->id}/pay", ['amount' => 100])
            ->assertStatus(404);
    }

    public function test_signup_still_creates_a_linked_contact(): void
    {
        $response = $this->signUp('brand.new@example.com');
        $contactId = $response['data']['user']['contact_id'];

        $this->assertNotNull($contactId, 'every portal user must still have a contact');
        $contact = Contact::find($contactId);
        $this->assertSame('customer', $contact->type);
        $this->assertSame('brand.new@example.com', $contact->email);
    }

    public function test_a_duplicate_contact_is_the_accepted_trade_off(): void
    {
        $this->existingCustomerWithInvoice();
        $this->signUp(self::EMAIL);

        // Two contacts now share the email. That is deliberate: an admin merges
        // or relinks them once identity is confirmed.
        $this->assertSame(2, Contact::where('email', self::EMAIL)->count());
    }
}
