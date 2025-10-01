package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"github.com/neirogen/graphicdictation/internal/worker"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := worker.Run(ctx); err != nil {
		log.Fatalf("graphic dictation worker failed: %v", err)
	}
}
