<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComfyPreset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class ComfyPresetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = ComfyPreset::query()
            ->orderByDesc('enabled')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $v = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'graph' => 'required', // JSON object or array
            'defaults' => 'nullable',
            'enabled' => 'boolean',
        ]);
        $v->validate();

        $graph = $request->input('graph');
        if (is_string($graph)) {
            $graph = json_decode($graph, true);
        }
        if (! is_array($graph)) {
            return response()->json(['message' => 'graph must be JSON object/array'], 422);
        }
        $defaults = $request->input('defaults');
        if (is_string($defaults) && $defaults !== '') {
            $defaults = json_decode($defaults, true);
            if (! is_array($defaults)) {
                return response()->json(['message' => 'defaults must be JSON object'], 422);
            }
        } elseif ($defaults === null) {
            $defaults = [];
        }

        $item = ComfyPreset::create([
            'name' => (string) $request->string('name'),
            'description' => $request->string('description')->toString() ?: null,
            'graph' => $graph,
            'defaults' => $defaults,
            'enabled' => (bool) $request->boolean('enabled', true),
        ]);

        return response()->json($item, 201);
    }

    public function show(ComfyPreset $comfyPreset): JsonResponse
    {
        return response()->json($comfyPreset);
    }

    public function update(Request $request, ComfyPreset $comfyPreset): JsonResponse
    {
        $data = $request->all();
        if (array_key_exists('graph', $data)) {
            $graph = $data['graph'];
            if (is_string($graph)) {
                $graph = json_decode($graph, true);
            }
            if (! is_array($graph)) {
                return response()->json(['message' => 'graph must be JSON object/array'], 422);
            }
            $data['graph'] = $graph;
        }
        if (array_key_exists('defaults', $data)) {
            $defaults = $data['defaults'];
            if (is_string($defaults) && $defaults !== '') {
                $defaults = json_decode($defaults, true);
            }
            if ($defaults !== null && ! is_array($defaults)) {
                return response()->json(['message' => 'defaults must be JSON object'], 422);
            }
            $data['defaults'] = $defaults ?? [];
        }
        if (array_key_exists('name', $data) && (! is_string($data['name']) || $data['name'] === '')) {
            return response()->json(['message' => 'name must be non-empty string'], 422);
        }

        $comfyPreset->fill($data);
        $comfyPreset->save();

        return response()->json($comfyPreset);
    }

    public function destroy(ComfyPreset $comfyPreset): JsonResponse
    {
        $comfyPreset->delete();

        return response()->json(['ok' => true]);
    }
}
