<?php

declare(strict_types=1);

namespace App\Services\Comfy;

final class GraphBuilder
{
    /**
     * Replace placeholders like {{var}} in any string values within the graph array.
     * @param array<string,mixed> $graph
     * @param array<string,mixed> $vars
     * @return array<string,mixed>
     */
    public static function applyVariables(array $graph, array $vars): array
    {
        $replace = static function ($value) use (&$replace, $vars) {
            if (is_array($value)) {
                $new = [];
                foreach ($value as $k => $v) {
                    $new[$k] = $replace($v);
                }
                return $new;
            }
            if (is_string($value)) {
                return preg_replace_callback('/{{\s*([a-zA-Z0-9_\.\-]+)\s*}}/', function ($m) use ($vars) {
                    $key = $m[1];
                    return array_key_exists($key, $vars) ? (string) $vars[$key] : $m[0];
                }, $value);
            }
            return $value;
        };
        return $replace($graph);
    }
}
