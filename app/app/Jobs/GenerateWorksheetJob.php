<?php

namespace App\Jobs;

use App\Services\WorksheetPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateWorksheetJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int[] */
    public array $exerciseIds;
    public string $format;
    public int $copies;

    public function __construct(array $exerciseIds, string $format = 'A4', int $copies = 1)
    {
        $this->exerciseIds = $exerciseIds;
        $this->format = $format;
        $this->copies = $copies;
        $this->onQueue('default');
    }

    public function handle(WorksheetPdfService $service): void
    {
        // Сервис сам обработает генерацию и сохранение, исключения попадут в failed() если настроено
        $service->generate($this->exerciseIds, $this->format, $this->copies);
    }
}
