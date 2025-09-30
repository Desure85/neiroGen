package worker

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	gojson "github.com/goccy/go-json"
	"github.com/streadway/amqp"

	"neirogen/app/server/generators/graphicdictation/internal/api"
	"neirogen/app/server/generators/graphicdictation/internal/generator"
)

const (
	defaultRabbitURL      = "amqp://guest:guest@rabbitmq:5672/"
	tasksQueueName        = "generator.graphic_dictation"
	resultsQueueName      = "generator.graphic_dictation.results"
	maxReconnectAttempts  = 10
	reconnectBackoffStart = 500 * time.Millisecond
)

// Run starts RabbitMQ consumer loop and blocks until context cancellation or signal.
func Run(ctx context.Context) error {
	rabbitURL := os.Getenv("RABBITMQ_URL")
	if rabbitURL == "" {
		rabbitURL = defaultRabbitURL
	}

	log.Printf("[graphic-dictation] connecting to RabbitMQ %s", rabbitURL)

	conn, ch, err := connect(rabbitURL)
	if err != nil {
		return err
	}
	defer func() {
		_ = ch.Close()
		_ = conn.Close()
	}()

	if err := setupQueues(ch); err != nil {
		return err
	}

	messages, err := ch.Consume(tasksQueueName, "graphic-dictation-worker", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume: %w", err)
	}

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-sigs:
			return nil
		case msg, ok := <-messages:
			if !ok {
				return fmt.Errorf("rabbitmq channel closed")
			}
			if err := handleMessage(ch, &msg); err != nil {
				log.Printf("[graphic-dictation] handle message error: %v", err)
				_ = msg.Nack(false, true)
				continue
			}
			_ = msg.Ack(false)
		}
	}
}

func connect(url string) (*amqp.Connection, *amqp.Channel, error) {
	var conn *amqp.Connection
	var err error
	backoff := reconnectBackoffStart
	for attempt := 0; attempt < maxReconnectAttempts; attempt++ {
		conn, err = amqp.Dial(url)
		if err == nil {
			break
		}
		log.Printf("[graphic-dictation] rabbit connection failed: %v", err)
		time.Sleep(backoff)
		backoff *= 2
	}
	if err != nil {
		return nil, nil, fmt.Errorf("connect rabbit: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, nil, fmt.Errorf("open channel: %w", err)
	}
	if err := ch.Qos(1, 0, false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, nil, fmt.Errorf("set qos: %w", err)
	}

	return conn, ch, nil
}

func setupQueues(ch *amqp.Channel) error {
	if _, err := ch.QueueDeclare(tasksQueueName, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare tasks queue: %w", err)
	}
	if _, err := ch.QueueDeclare(resultsQueueName, true, false, false, false, nil); err != nil {
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

func handleMessage(ch *amqp.Channel, msg *amqp.Delivery) error {
	var req api.GenerateRequest
	if err := gojson.Unmarshal(msg.Body, &req); err != nil {
		return fmt.Errorf("decode request: %w", err)
	}

	log.Printf("[graphic-dictation] processing job=%s shard=%d/%d", req.JobID, req.ShardIndex+1, req.ShardTotal)

	res, err := generator.Generate(req)

	msgPayload := resultMessage{
		JobID:      req.JobID,
		ShardIndex: req.ShardIndex,
	}

	if err != nil {
		msgPayload.Status = "failed"
		msgPayload.Error = err.Error()
	} else {
		msgPayload.Status = "completed"
		msgPayload.Payload = &res
	}

	payload, err := gojson.Marshal(msgPayload)
	if err != nil {
		return fmt.Errorf("marshal result: %w", err)
	}

	if err := ch.Publish("", resultsQueueName, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        payload,
		Expiration:  "600000",
	}); err != nil {
		return fmt.Errorf("publish result: %w", err)
	}

	return nil
}
