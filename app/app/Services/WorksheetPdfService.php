<?php

namespace App\Services;

use App\Models\Exercise;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class WorksheetPdfService
{
    /**
     * Generate a worksheet PDF and return its public URL.
     */
    public function generate(array $exerciseIds, string $format = 'A4', int $copies = 1): string
    {
        $format = strtoupper($format);
        if (!in_array($format, ['A4', 'A5'], true)) {
            throw new InvalidArgumentException('Unsupported format supplied.');
        }

        $copies = max(1, min(10, $copies));

        $exercises = Exercise::whereIn('id', $exerciseIds)->get();
        if ($exercises->isEmpty()) {
            throw new RuntimeException('No exercises found for worksheet generation.');
        }

        $data = [
            'format' => $format,
            'exercises' => $exercises,
            'copies' => $copies,
        ];

        $pdf = Pdf::loadView('pdf.worksheet', $data)
            ->setPaper($format === 'A5' ? 'a5' : 'a4', 'portrait');

        $fileName = sprintf(
            'worksheets/%s_%s.pdf',
            now()->format('Ymd_His'),
            Str::random(8)
        );

        Storage::disk('public')->put($fileName, $pdf->output());

        return Storage::disk('public')->url($fileName);
    }
}
