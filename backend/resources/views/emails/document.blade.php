<p>Hello {{ $greetingName }},</p>

@foreach ($lines as $line)
    <p>{{ $line }}</p>
@endforeach

<p>The document is attached as a PDF.</p>

<p>
    Regards,<br>
    LedgerCraft — Urban Furniture
</p>
