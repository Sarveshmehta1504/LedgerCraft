<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\ContactRequest;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Contact::class);

        $contacts = Contact::query()
            ->archiveFilter($request->query('archived'))
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->query('search'), fn ($q, $term) => $q->where(
                fn ($sub) => $sub->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('mobile', 'like', "%{$term}%")
            ))
            ->orderBy('name')
            ->get();

        return $this->ok('Contacts fetched successfully', $contacts);
    }

    public function store(ContactRequest $request): JsonResponse
    {
        $this->authorize('create', Contact::class);

        $contact = Contact::create($request->validated());

        return $this->ok('Contact created successfully', $contact, 201);
    }

    public function show(Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        return $this->ok('Contact fetched successfully', $contact);
    }

    public function update(ContactRequest $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $contact->update($request->validated());

        return $this->ok('Contact updated successfully', $contact);
    }

    public function archive(Contact $contact): JsonResponse
    {
        $this->authorize('archive', $contact);

        // Assigned directly, not via update(): archived_at is deliberately
        // not fillable so it can never be set from a request payload.
        $contact->archived_at = now();
        $contact->save();

        return $this->ok('Contact archived successfully', $contact);
    }

    public function unarchive(Contact $contact): JsonResponse
    {
        $this->authorize('archive', $contact);

        $contact->archived_at = null;
        $contact->save();

        return $this->ok('Contact unarchived successfully', $contact);
    }

    /**
     * Hard delete is only allowed while the contact has no history. Once it is
     * referenced anywhere, archiving is the only option.
     */
    public function destroy(Contact $contact): JsonResponse
    {
        $this->authorize('delete', $contact);

        if ($contact->users()->exists()) {
            return $this->fail(
                'Contact has a linked portal user and cannot be deleted - archive it instead',
                409,
            );
        }

        $contact->delete();

        return $this->ok('Contact deleted successfully');
    }
}
