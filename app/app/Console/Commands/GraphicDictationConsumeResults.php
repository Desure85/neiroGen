<?php

namespace App\Console\Commands;

use App\Services\Generator\GeneratorJobService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Throwable;

class GraphicDictationConsumeResults extends Command
{
    protected $signature = 'generator:graphic-dictation:consume-results';

    protected $description = 'Consume completed graphic dictation shards from RabbitMQ and update generator jobs.';

    private const RESULTS_QUEUE = 'generator.graphic_dictation.results';

    public function __construct(private readonly GeneratorJobService $jobService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        [$host, $port, $user, $password, $vhost] = $this->resolveRabbitCredentials();

        $this->info(sprintf('Connecting to RabbitMQ %s:%d vhost "%s"', $host, $port, $vhost));

        try {
            $connection = new AMQPStreamConnection($host, $port, $user, $password, $vhost);
        } catch (Throwable $exception) {
            $this->error('Unable to connect to RabbitMQ: ' . $exception->getMessage());
            Log::error('Graphic dictation results consumer connection failure', ['exception' => $exception]);

            return self::FAILURE;
        }

        try {
            $channel = $connection->channel();
            $channel->queue_declare(self::RESULTS_QUEUE, false, true, false, false);
            $channel->basic_qos(0, 1, false);

            $this->info('Waiting for graphic dictation results...');

            $callback = function (AMQPMessage $message) use ($channel): void {
                $body = $message->getBody();

                try {
                    $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
                    $this->processResultMessage($payload ?? []);
                    $message->ack();
                } catch (Throwable $exception) {
                    $this->error('Failed to process result message: ' . $exception->getMessage());
                    Log::error('Graphic dictation result processing failed', [
                        'exception' => $exception,
                        'body' => $body,
                    ]);
                    $message->nack(false, false);
                }
            };

            $channel->basic_consume(self::RESULTS_QUEUE, 'graphic-dictation-results-consumer', false, false, false, false, $callback);

            while ($channel->is_consuming()) {
                $channel->wait();
            }

            $channel->close();
        } catch (Throwable $exception) {
            $this->error('Results consumer crashed: ' . $exception->getMessage());
            Log::error('Graphic dictation results consumer crashed', ['exception' => $exception]);

            return self::FAILURE;
        } finally {
            $connection->close();
        }

        $this->info('Results consumer stopped.');

        return self::SUCCESS;
    }

    /**
     * @return array{string,int,string,string,string}
     */
    private function resolveRabbitCredentials(): array
    {
        $config = config('queue.connections.rabbitmq', []);

        $host = $config['host'] ?? env('RABBITMQ_HOST', 'rabbitmq');
        $port = (int) ($config['port'] ?? env('RABBITMQ_PORT', 5672));
        $user = $config['username'] ?? env('RABBITMQ_USER', 'guest');
        $password = $config['password'] ?? env('RABBITMQ_PASSWORD', 'guest');
        $vhost = $config['vhost'] ?? env('RABBITMQ_VHOST', '/');

        return [$host, $port, $user, $password, $vhost];
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function processResultMessage(array $payload): void
    {
        $jobId = $payload['job_id'] ?? null;
        $shardIndex = $payload['shard_index'] ?? null;

        if (! is_string($jobId) || ! is_int($shardIndex)) {
            throw new \RuntimeException('Result message missing job_id or shard_index.');
        }

        $shard = $this->jobService->getShard($jobId, $shardIndex);
        if ($shard === null) {
            Log::warning('Graphic dictation result for unknown shard', [
                'job_id' => $jobId,
                'shard_index' => $shardIndex,
            ]);

            return;
        }

        $status = $payload['status'] ?? 'failed';
        if ($status === 'completed') {
            $resultPayload = $payload['payload'] ?? [];
            if (! is_array($resultPayload)) {
                $resultPayload = [];
            }

            $this->jobService->completeShard($shard, $resultPayload);
        } else {
            $error = (string) ($payload['error'] ?? 'Unknown generator error');
            $this->jobService->failShard($shard, $error);
        }
    }
}
