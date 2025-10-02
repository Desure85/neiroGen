<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GraphicDictation\GraphicDictationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Контроллер для работы с графическими диктантами (JSON точек и команд).
 */
class GraphicDictationController extends Controller
{
    public function __construct(
        private readonly GraphicDictationService $service
    ) {
    }

    /**
     * Валидирует и возвращает payload графического диктанта.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function validatePayload(Request $request): JsonResponse
    {
        try {
            $payload = $this->service->validatePayload($request->all());

            return response()->json([
                'valid' => true,
                'payload' => $payload,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'valid' => false,
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Генерирует команды из массива точек.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateCommands(Request $request): JsonResponse
    {
        // Логируем входные данные для отладки
        Log::info('GraphicDictation generateCommands request', [
            'all' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);
        
        $request->validate([
            'points' => 'required|array|min:2',
            'points.*.row' => 'required|integer|min:0',
            'points.*.col' => 'required|integer|min:0',
            'allow_diagonals' => 'sometimes|boolean',
        ]);

        $points = $request->input('points');
        $allowDiagonals = $request->boolean('allow_diagonals', false);

        $commands = $this->service->generateCommands($points, $allowDiagonals);

        return response()->json([
            'commands' => $commands,
        ]);
    }

    /**
     * Создаёт пустой шаблон графического диктанта.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'width' => 'sometimes|integer|min:4|max:64',
            'height' => 'sometimes|integer|min:4|max:64',
            'cell_size_mm' => 'sometimes|integer|min:5|max:20',
        ]);

        $width = $request->integer('width', 16);
        $height = $request->integer('height', 16);
        $cellSizeMm = $request->integer('cell_size_mm', 10);

        $template = $this->service->createEmptyTemplate($width, $height, $cellSizeMm);

        return response()->json($template);
    }
}
