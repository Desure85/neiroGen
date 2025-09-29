<?php

namespace App\Services\Generator;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class GraphicDictationQueueService
{
    private const TASKS_QUEUE = 'generator.graphic_dictation';

    public function __construct(
        private ?string $host = null,
        private ?int $port = null,
        private ?string $username = null,
        private ?string $password = null,
        private ?string $vhost = null,
    ) {
        $this->host ??= config('queue.connections.rabbitmq.host', env('RABBITMQ_HOST', 'rabbitmq'));
        $this->port ??= (int) config('queue.connections.rabbitmq.port', env('RABBITMQ_PORT', 5672));
        $this->username ??= config('queue.connections.rabbitmq.username', env('RABBITMQ_USER', 'guest'));
        $this->password ??= config('queue.connections.rabbitmq.password', env('RABBITMQ_PASSWORD', 'guest'));
        $this->vhost ??= config('queue.connections.rabbitmq.vhost', env('RABBITMQ_VHOST', '/'));
    }

    public function publishShard(array $payload): void
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $connection = new AMQPStreamConnection(
            $this->host,
            $this->port,
            $this->username,
            $this->password,
            $this->vhost
        );

        try {
            $channel = $connection->channel();
            $channel->queue_declare(self::TASKS_QUEUE, false, true, false, false);

            $message = new AMQPMessage($body, [
                'content_type' => 'application/json',
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            ]);

            $channel->basic_publish($message, '', self::TASKS_QUEUE);
        } finally {
            if (isset($channel) && $channel->is_open()) {
                $channel->close();
            }
            if ($connection->isConnected()) {
                $connection->close();
            }
        }
    }
}
