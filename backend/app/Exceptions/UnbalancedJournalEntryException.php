<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Thrown when a journal entry would violate double-entry bookkeeping.
 *
 * This is a 422, not a 500: the caller sent something invalid, and the API
 * must say exactly what was wrong so the UI can show the blocking warning the
 * design board asks for.
 */
class UnbalancedJournalEntryException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?string $totalDebit = null,
        public readonly ?string $totalCredit = null,
    ) {
        parent::__construct($message);
    }

    public static function mismatch(string $debit, string $credit): self
    {
        return new self(
            "Journal entry is not balanced: debit total {$debit} does not equal credit total {$credit}",
            $debit,
            $credit,
        );
    }

    public function render(Request $request): JsonResponse
    {
        $payload = ['code' => 422, 'message' => $this->getMessage()];

        if ($this->totalDebit !== null) {
            $payload['errors'] = [
                'total_debit' => $this->totalDebit,
                'total_credit' => $this->totalCredit,
            ];
        }

        return response()->json($payload, 422);
    }
}
