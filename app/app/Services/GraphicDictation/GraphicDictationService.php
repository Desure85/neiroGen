<?php

namespace App\Services\GraphicDictation;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Сервис для работы с графическими диктантами.
 * Хранит JSON с точками и инструкциями, валидирует структуру.
 */
class GraphicDictationService
{
    /**
     * Валидирует payload графического диктанта.
     *
     * @return array Validated payload
     *
     * @throws ValidationException
     */
    public function validatePayload(array $payload): array
    {
        $validator = Validator::make($payload, [
            'grid' => 'required|array',
            'grid.width' => 'required|integer|min:4|max:64',
            'grid.height' => 'required|integer|min:4|max:64',
            'grid.cell_size_mm' => 'required|integer|min:5|max:20',
            'start' => 'required|array',
            'start.row' => 'required|integer|min:0',
            'start.col' => 'required|integer|min:0',
            'points' => 'required|array|min:1',
            'points.*.row' => 'required|integer|min:0',
            'points.*.col' => 'required|integer|min:0',
            'commands' => 'sometimes|array',
            'commands.*.action' => 'required_with:commands|string|in:move,draw',
            'commands.*.direction' => 'sometimes|string|in:up,down,left,right,up-right,up-left,down-right,down-left',
            'commands.*.steps' => 'sometimes|integer|min:1',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $validated = $validator->validated();

        // Проверка, что стартовая точка в пределах сетки
        if ($validated['start']['row'] >= $validated['grid']['height'] || $validated['start']['col'] >= $validated['grid']['width']) {
            throw ValidationException::withMessages([
                'start' => ['Стартовая точка выходит за пределы сетки.'],
            ]);
        }

        // Проверка, что все точки в пределах сетки
        foreach ($validated['points'] as $index => $point) {
            if ($point['row'] >= $validated['grid']['height'] || $point['col'] >= $validated['grid']['width']) {
                throw ValidationException::withMessages([
                    "points.{$index}" => ['Точка выходит за пределы сетки.'],
                ]);
            }
        }

        return $validated;
    }

    /**
     * Генерирует команды из массива точек.
     */
    public function generateCommands(array $points, bool $allowDiagonals = false): array
    {
        if (count($points) < 2) {
            return [];
        }

        $commands = [];
        for ($i = 1; $i < count($points); $i++) {
            $prev = $points[$i - 1];
            $curr = $points[$i];

            $dr = $curr['row'] - $prev['row'];
            $dc = $curr['col'] - $prev['col'];

            $direction = $this->determineDirection($dr, $dc, $allowDiagonals);
            if ($direction === null) {
                // Невалидное движение
                continue;
            }

            $steps = max(abs($dr), abs($dc));
            $commands[] = [
                'action' => 'draw',
                'direction' => $direction,
                'steps' => $steps,
            ];
        }

        return $commands;
    }

    /**
     * Определяет направление движения.
     */
    private function determineDirection(int $dr, int $dc, bool $allowDiagonals): ?string
    {
        if ($dr === 0 && $dc > 0) {
            return 'right';
        }
        if ($dr === 0 && $dc < 0) {
            return 'left';
        }
        if ($dr > 0 && $dc === 0) {
            return 'down';
        }
        if ($dr < 0 && $dc === 0) {
            return 'up';
        }

        if (! $allowDiagonals) {
            return null;
        }

        if ($dr < 0 && $dc > 0) {
            return 'up-right';
        }
        if ($dr < 0 && $dc < 0) {
            return 'up-left';
        }
        if ($dr > 0 && $dc > 0) {
            return 'down-right';
        }
        if ($dr > 0 && $dc < 0) {
            return 'down-left';
        }

        return null;
    }

    /**
     * Создаёт пустой шаблон графического диктанта.
     */
    public function createEmptyTemplate(int $width = 16, int $height = 16, int $cellSizeMm = 10): array
    {
        return [
            'grid' => [
                'width' => $width,
                'height' => $height,
                'cell_size_mm' => $cellSizeMm,
            ],
            'start' => [
                'row' => 0,
                'col' => 0,
            ],
            'points' => [
                ['row' => 0, 'col' => 0],
            ],
            'commands' => [],
        ];
    }
}
