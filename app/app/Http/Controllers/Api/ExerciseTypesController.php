<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExerciseTypesController extends Controller
{
    public function index(): JsonResponse
    {
        $cfg = config('exercise_types.types');
        $list = [];
        foreach ($cfg as $key => $def) {
            $list[] = [
                'key' => $key,
                'name' => $def['name'] ?? $key,
                'domain' => $def['domain'] ?? 'neuro',
                'icon' => $def['icon'] ?? '🧩',
                'description' => $def['description'] ?? '',
            ];
        }
        return response()->json(['types' => $list]);
    }

    public function show(string $key): JsonResponse
    {
        $def = config('exercise_types.types.' . $key);
        if (!$def) {
            return response()->json(['error' => 'type_not_found'], 404);
        }
        return response()->json([
            'key' => $key,
            'name' => $def['name'] ?? $key,
            'domain' => $def['domain'] ?? 'neuro',
            'icon' => $def['icon'] ?? '🧩',
            'description' => $def['description'] ?? '',
            'schema' => $def['schema'] ?? [],
            'defaults' => array_reduce(array_keys($def['schema'] ?? []), function ($acc, $k) use ($def) {
                $v = $def['schema'][$k]['default'] ?? null;
                if ($v !== null) $acc[$k] = $v;
                return $acc;
            }, []),
        ]);
    }
}
