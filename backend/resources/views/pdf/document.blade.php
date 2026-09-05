@extends('pdf.layout')

@section('title', $heading.' '.$number)
@section('doc-title', $heading)
@section('doc-number', $number)

@section('content')
    <table class="meta">
        <tr>
            <td>
                <div class="label">{{ $partyLabel }}</div>
                <div class="value">{{ $contact->name }}</div>
                @if ($contact->email)<div>{{ $contact->email }}</div>@endif
                @if ($contact->mobile)<div>{{ $contact->mobile }}</div>@endif
                @if ($contact->address_street)<div>{{ $contact->address_street }}</div>@endif
                @if ($contact->address_city || $contact->address_state)
                    <div>{{ collect([$contact->address_city, $contact->address_state, $contact->address_pin])->filter()->implode(', ') }}</div>
                @endif
            </td>
            <td>
                <table style="width:100%">
                    <tr><td class="label">Date</td><td class="right">{{ $date?->format('d M Y') }}</td></tr>
                    @if ($dueDate)
                        <tr><td class="label">Due date</td><td class="right">{{ $dueDate->format('d M Y') }}</td></tr>
                    @endif
                    @if ($reference)
                        <tr><td class="label">Reference</td><td class="right">{{ $reference }}</td></tr>
                    @endif
                    @if ($sourceLabel)
                        <tr><td class="label">{{ $sourceLabel }}</td><td class="right">{{ $sourceNumber }}</td></tr>
                    @endif
                    <tr><td class="label">Status</td><td class="right"><span class="status">{{ $status }}</span></td></tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="lines">
        <thead>
            <tr>
                <th style="width:4%">#</th>
                <th>Product</th>
                <th>Account</th>
                <th>Analytic</th>
                <th class="right" style="width:8%">Qty</th>
                <th class="right" style="width:14%">Unit price</th>
                @if ($showTax)<th class="right" style="width:8%">Tax %</th>@endif
                <th class="right" style="width:16%">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($lines as $index => $line)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $line->product?->name ?? '—' }}</td>
                    <td>{{ $line->account?->name ?? '—' }}</td>
                    <td>{{ $line->analyticAccount?->name ?? '—' }}</td>
                    <td class="right">{{ rtrim(rtrim(number_format((float) $line->quantity, 2), '0'), '.') }}</td>
                    <td class="right">{{ number_format((float) $line->unit_price, 2) }}</td>
                    @if ($showTax)<td class="right">{{ number_format((float) ($line->tax_percent ?? 0), 2) }}</td>@endif
                    <td class="right">{{ number_format((float) $line->subtotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        @if ($showTax)
            <tr><td class="label">Subtotal</td><td class="right">{{ number_format($subtotal, 2) }}</td></tr>
            <tr><td class="label">Tax</td><td class="right">{{ number_format($taxTotal, 2) }}</td></tr>
        @endif
        <tr class="grand"><td>Total</td><td class="right">{{ number_format((float) $total, 2) }}</td></tr>
        @if ($amountPaid !== null)
            <tr><td class="label">Paid</td><td class="right">{{ number_format((float) $amountPaid, 2) }}</td></tr>
            <tr><td class="label">Amount due</td><td class="right"><strong>{{ number_format((float) $amountDue, 2) }}</strong></td></tr>
        @endif
    </table>
@endsection
