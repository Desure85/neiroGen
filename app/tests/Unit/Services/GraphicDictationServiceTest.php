<?php

namespace Tests\Unit\Services;

use App\Services\GraphicDictation\GraphicDictationService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GraphicDictationServiceTest extends TestCase
{
    private GraphicDictationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new GraphicDictationService;
    }

    public function test_validates_correct_payload(): void
    {
        $payload = [
            'grid' => [
                'width' => 16,
                'height' => 16,
                'cell_size_mm' => 10,
            ],
            'start' => [
                'row' => 0,
                'col' => 0,
            ],
            'points' => [
                ['row' => 0, 'col' => 0],
                ['row' => 0, 'col' => 3],
            ],
            'commands' => [
                ['action' => 'draw', 'direction' => 'right', 'steps' => 3],
            ],
        ];

        $validated = $this->service->validatePayload($payload);

        $this->assertIsArray($validated);
        $this->assertEquals(16, $validated['grid']['width']);
        $this->assertCount(2, $validated['points']);
    }

    public function test_throws_validation_exception_for_invalid_grid(): void
    {
        $this->expectException(ValidationException::class);

        $payload = [
            'grid' => [
                'width' => 2, // Too small
                'height' => 16,
                'cell_size_mm' => 10,
            ],
            'start' => ['row' => 0, 'col' => 0],
            'points' => [['row' => 0, 'col' => 0]],
        ];

        $this->service->validatePayload($payload);
    }

    public function test_throws_validation_exception_for_start_out_of_bounds(): void
    {
        $this->expectException(ValidationException::class);

        $payload = [
            'grid' => [
                'width' => 16,
                'height' => 16,
                'cell_size_mm' => 10,
            ],
            'start' => ['row' => 20, 'col' => 0], // Out of bounds
            'points' => [['row' => 0, 'col' => 0]],
        ];

        $this->service->validatePayload($payload);
    }

    public function test_generates_commands_from_points(): void
    {
        $points = [
            ['row' => 0, 'col' => 0],
            ['row' => 0, 'col' => 3],
            ['row' => 3, 'col' => 3],
        ];

        $commands = $this->service->generateCommands($points, false);

        $this->assertCount(2, $commands);
        $this->assertEquals('right', $commands[0]['direction']);
        $this->assertEquals(3, $commands[0]['steps']);
        $this->assertEquals('down', $commands[1]['direction']);
        $this->assertEquals(3, $commands[1]['steps']);
    }

    public function test_generates_diagonal_commands_when_allowed(): void
    {
        $points = [
            ['row' => 0, 'col' => 0],
            ['row' => 2, 'col' => 2],
        ];

        $commands = $this->service->generateCommands($points, true);

        $this->assertCount(1, $commands);
        $this->assertEquals('down-right', $commands[0]['direction']);
        $this->assertEquals(2, $commands[0]['steps']);
    }

    public function test_creates_empty_template(): void
    {
        $template = $this->service->createEmptyTemplate(20, 20, 8);

        $this->assertEquals(20, $template['grid']['width']);
        $this->assertEquals(20, $template['grid']['height']);
        $this->assertEquals(8, $template['grid']['cell_size_mm']);
        $this->assertCount(1, $template['points']);
        $this->assertEmpty($template['commands']);
    }
}
