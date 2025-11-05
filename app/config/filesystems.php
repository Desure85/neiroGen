<?php

return [
    'default' => env('FILESYSTEM_DISK', 'public'),

    'cloud' => env('FILESYSTEM_CLOUD', 's3'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID', env('MINIO_ACCESS_KEY')),
            'secret' => env('AWS_SECRET_ACCESS_KEY', env('MINIO_SECRET_KEY')),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET', env('MINIO_BUCKET')),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT', env('MINIO_ENDPOINT')),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => false,
        ],

        'minio' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY', 'minioadmin'),
            'secret' => env('MINIO_SECRET_KEY', 'minioadmin'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'neirogen'),
            'url' => env('MINIO_URL'),
            'endpoint' => env('MINIO_ENDPOINT', 'http://minio:9000'),
            'use_path_style_endpoint' => true,
            'visibility' => 'public',
            'throw' => false,
        ],
    ],
];
