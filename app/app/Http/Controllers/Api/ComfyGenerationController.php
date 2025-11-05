<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComfyPreset;
use App\Services\Comfy\ComfyClient;
use App\Services\Comfy\GraphBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

final class ComfyGenerationController extends Controller
{
    public function generate(Request $request, ComfyPreset $comfyPreset): JsonResponse
    {
        if (! $comfyPreset->enabled) {
            return response()->json(['ok' => false, 'error' => 'preset_disabled'], 400);
        }

        $v = Validator::make($request->all(), [
            'vars' => 'nullable|array',
        ]);
        $v->validate();

        $vars = (array) ($request->input('vars') ?? []);
        $defaults = is_array($comfyPreset->defaults) ? $comfyPreset->defaults : [];
        $mergedVars = array_merge($defaults, $vars);

        $graph = is_array($comfyPreset->graph) ? $comfyPreset->graph : [];
        $resolved = GraphBuilder::applyVariables($graph, $mergedVars);

        $client = ComfyClient::fromEnv();
        $payload = [
            'prompt' => $resolved,
        ];
        $resp = $client->prompt($payload);
        if (! ($resp['ok'] ?? false)) {
            return response()->json(['ok' => false, 'error' => $resp['error'] ?? 'unknown_error', 'upstream' => $resp['body'] ?? null], 502);
        }

        return response()->json(['ok' => true, 'preset_id' => $comfyPreset->id, 'prompt_id' => $resp['prompt_id'] ?? null]);
    }
}
