<?php

return [
    'svggen' => [
        'timeout' => env('SVGGEN_TIMEOUT', 150),
    ],
    'comfyui' => [
        'url' => env('COMFYUI_URL', 'http://localhost:8188'),
        'timeout' => env('COMFYUI_TIMEOUT', 120),
    ],
];
