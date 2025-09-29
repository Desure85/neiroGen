<?php

return [
    'default' => env('QUEUE_CONNECTION', 'sync'),

    'connections' => [
        'sync' => [
            'driver' => 'sync',
        ],

        'database' => [
            'driver' => 'database',
            'table' => 'jobs',
            'queue' => 'default',
            'retry_after' => 90,
            'after_commit' => false,
        ],

        'redis' => [
            'driver' => 'redis',
            'connection' => 'default',
            'queue' => env('REDIS_QUEUE', 'default'),
            'retry_after' => 90,
            'block_for' => null,
            'after_commit' => false,
        ],

        'rabbitmq' => [
            'driver' => 'rabbitmq',
            'queue' => env('RABBITMQ_QUEUE', 'default'),
            'connection' => \PhpAmqpLib\Connection\AMQPStreamConnection::class,
            'hosts' => [
                [
                    'host' => env('RABBITMQ_HOST', 'rabbitmq'),
                    'port' => env('RABBITMQ_PORT', 5672),
                    'user' => env('RABBITMQ_USER', 'guest'),
                    'password' => env('RABBITMQ_PASSWORD', 'guest'),
                    'vhost' => env('RABBITMQ_VHOST', '/'),
                ],
            ],
            'options' => [
                'ssl_options' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
                'queue' => [
                    'exchange' => env('RABBITMQ_EXCHANGE', ''),
                    'exchange_type' => env('RABBITMQ_EXCHANGE_TYPE', 'direct'),
                    'exchange_routing_key' => env('RABBITMQ_ROUTING_KEY', null),
                    'exchange_durable' => env('RABBITMQ_EXCHANGE_DURABLE', true),
                    'exchange_auto_delete' => env('RABBITMQ_EXCHANGE_AUTO_DELETE', false),
                    'passive' => false,
                    'durable' => true,
                    'exclusive' => false,
                    'auto_delete' => false,
                    'arguments' => [],
                ],
                'heartbeat' => 0,
                'read_write_timeout' => 0,
            ],
            'retry_after' => 90,
            'after_commit' => false,
        ],
    ],

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'pgsql'),
        'table' => 'failed_jobs',
    ],
];
