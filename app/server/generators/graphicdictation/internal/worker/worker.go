package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/neirogen/graphicdictation/internal/api"
	"github.com/neirogen/graphicdictation/internal/generator"
)

const (
	defaultRabbitURL        = "amqp://guest:guest@rabbitmq:5672/"
	defaultTasksQueue       = "generator.graphic_dictation"
	defaultResultsQueue     = "generator.graphic_dictation.results"
	defaultPrefetch         = 1
	defaultResultTTLSeconds = 600
	reconnectMaxAttempts    = 10
	reconnectBackoffInitial = 500 * time.Millisecond
)

// Run запускает воркер графического диктанта и блокируется до завершения контекста.
func Run(ctx context.Context) error {
	cfg := loadConfig()

	service, err := generator.NewService()
	if err != nil {
		return fmt.Errorf("init generator service: %w", err)
	}

	conn, ch, err := connectRabbit(cfg)
	if err != nil {
		return err
	}
	defer func() {
		_ = ch.Close()
		_ = conn.Close()
	}()

	if err := setupQueues(ch, cfg); err != nil {
		return err
	}

	deliveries, err := ch.Consume(cfg.TasksQueue, "graphic-dictation-worker", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume tasks: %w", err)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-deliveries:
			if !ok {
				return errors.New("rabbitmq channel closed")
			}

			handleCtx, cancel := context.WithTimeout(ctx, cfg.TaskTimeout)
			handleErr := handleMessage(handleCtx, service, ch, &msg, cfg)
			cancel()

			if handleErr != nil {
				log.Printf("[graphic-dictation] message handling failed: %v", handleErr)
				if nackErr := msg.Nack(false, true); nackErr != nil {
					log.Printf("[graphic-dictation] nack failed: %v", nackErr)
				}
				continue
			}

			if err := msg.Ack(false); err != nil {
				log.Printf("[graphic-dictation] ack failed: %v", err)
			}
		}
	}
}

type workerConfig struct {
	RabbitURL    string
	TasksQueue   string
	ResultsQueue string
	ResultTTL    time.Duration
	TaskTimeout  time.Duration
	Prefetch     int
}

func loadConfig() workerConfig {
	cfg := workerConfig{
		RabbitURL:    getEnvOrDefault("RABBITMQ_URL", defaultRabbitURL),
		TasksQueue:   getEnvOrDefault("GRAPHIC_DICTATION_TASKS_QUEUE", defaultTasksQueue),
		ResultsQueue: getEnvOrDefault("GRAPHIC_DICTATION_RESULTS_QUEUE", defaultResultsQueue),
		ResultTTL:    time.Duration(defaultResultTTLSeconds) * time.Second,
		TaskTimeout:  2 * time.Minute,
		Prefetch:     defaultPrefetch,
	}

	if v := strings.TrimSpace(os.Getenv("GRAPHIC_DICTATION_RESULT_TTL")); v != "" {
		if ttlSeconds, err := strconv.Atoi(v); err == nil && ttlSeconds > 0 {
			cfg.ResultTTL = time.Duration(ttlSeconds) * time.Second
		}
	}

	if v := strings.TrimSpace(os.Getenv("GRAPHIC_DICTATION_TASK_TIMEOUT")); v != "" {
		if timeoutSeconds, err := strconv.Atoi(v); err == nil && timeoutSeconds > 0 {
			cfg.TaskTimeout = time.Duration(timeoutSeconds) * time.Second
		}
	}

	if v := strings.TrimSpace(os.Getenv("GRAPHIC_DICTATION_PREFETCH")); v != "" {
		if prefetch, err := strconv.Atoi(v); err == nil && prefetch > 0 {
			cfg.Prefetch = prefetch
		}
	}

	return cfg
}

func getEnvOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func connectRabbit(cfg workerConfig) (*amqp.Connection, *amqp.Channel, error) {
	backoff := reconnectBackoffInitial
	var conn *amqp.Connection
	var err error
	for attempt := 0; attempt < reconnectMaxAttempts; attempt++ {
		conn, err = amqp.Dial(cfg.RabbitURL)
		if err == nil {
			break
		}
		log.Printf("[graphic-dictation] rabbit connection failed (attempt %d/%d): %v", attempt+1, reconnectMaxAttempts, err)
		time.Sleep(backoff)
		backoff *= 2
	}
	if err != nil {
		return nil, nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, nil, fmt.Errorf("open channel: %w", err)
	}
	if err := ch.Qos(cfg.Prefetch, 0, false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, fmt.Errorf("set qos: %w", err)
	}

	return conn, ch, nil
}

func setupQueues(ch *amqp.Channel, cfg workerConfig) error {
	if _, err := ch.QueueDeclare(cfg.TasksQueue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare tasks queue: %w", err)
	}
	if _, err := ch.QueueDeclare(cfg.ResultsQueue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare results queue: %w", err)
	}
	return nil
}

type resultMessage struct {
	JobID      string                `json:"job_id"`
	ShardIndex int                   `json:"shard_index"`
	Status     string                `json:"status"`
	Payload    *api.GenerateResponse `json:"payload,omitempty"`
	Error      string                `json:"error,omitempty"`
}

func handleMessage(ctx context.Context, service *generator.Service, ch *amqp.Channel, msg *amqp.Delivery, cfg workerConfig) error {
	var req api.GenerateRequest
	if err := json.Unmarshal(msg.Body, &req); err != nil {
		return fmt.Errorf("decode request: %w", err)
	}

	if err := generator.ValidateRequest(req); err != nil {
		return fmt.Errorf("validate request: %w", err)
	}

	log.Printf("[graphic-dictation] processing job=%s shard=%d/%d", req.JobID, req.ShardIndex+1, req.ShardTotal)

	res, err := service.Generate(ctx, req)

	result := resultMessage{
		JobID:      req.JobID,
		ShardIndex: req.ShardIndex,
	}

	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
	} else {
		result.Status = "completed"
		result.Payload = res
	}

	body, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("marshal result: %w", err)
	}

	publishCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	properties := amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	}
	if cfg.ResultTTL > 0 {
		properties.Expiration = fmt.Sprintf("%d", int(cfg.ResultTTL/time.Millisecond))
	}

	if err := ch.PublishWithContext(publishCtx, "", cfg.ResultsQueue, false, false, properties); err != nil {
		return fmt.Errorf("publish result: %w", err)
	}

	return nil
}
