@extends('pdf.layout')

@section('title', $heading)
@section('doc-title', $heading)
@section('doc-number', $period)

@section('content')
    @foreach ($sections as $section)
        <table class="lines">
            <thead>
                <tr>
                    <th colspan="2">{{ $section['title'] }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($section['rows'] as $row)
                    <tr>
                        <td>{{ $row['label'] }}</td>
                        <td class="right">{{ $row['value'] }}</td>
                    </tr>
                @endforeach
                @if (isset($section['total']))
                    <tr>
                        <td><strong>{{ $section['total']['label'] }}</strong></td>
                        <td class="right"><strong>{{ $section['total']['value'] }}</strong></td>
                    </tr>
                @endif
            </tbody>
        </table>
        <br>
    @endforeach

    @if (isset($footnote))
        <p style="margin-top:18px; color:#666;">{{ $footnote }}</p>
    @endif
@endsection
