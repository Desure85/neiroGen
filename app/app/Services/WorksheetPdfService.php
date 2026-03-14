<?php

namespace App\Services;

use App\Models\Exercise;
use App\Models\Worksheet;
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
        if (! in_array($format, ['A4', 'A5'], true)) {
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

    /**
     * Generate a worksheet PDF from a Worksheet model (with items) and return its public URL.
     */
    public function generateFromWorksheet(\App\Models\Worksheet $worksheet, string $format = null): string
    {
        $format = $worksheet->format ?? 'A4';
        $format = strtoupper($format);
        
        if (! in_array($format, ['A4', 'A5'], true)) {
            $format = 'A4';
        }

        $copies = $worksheet->copies ?? 1;
        $copies = max(1, min(10, $copies));

        $items = $worksheet->items()->get();
        if ($items->isEmpty()) {
            throw new RuntimeException('No items found for worksheet generation.');
        }

        $data = [
            'format' => $format,
            'worksheet' => $worksheet,
            'items' => $items,
            'copies' => $copies,
        ];

        $pdf = Pdf::loadView('pdf.worksheet-items', $data)
            ->setPaper($format === 'A5' ? 'a5' : 'a4', 'portrait');

        $fileName = sprintf(
            'worksheets/%s_%s.pdf',
            $worksheet->id,
            now()->format('Ymd_His')
        );

        Storage::disk('public')->put($fileName, $pdf->output());

        $url = Storage::disk('public')->url($fileName);
        
        // Update worksheet with PDF path
        $worksheet->update(['pdf_path' => $url]);

        return $url;
    }
}
