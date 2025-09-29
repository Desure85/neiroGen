package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"neirogen/app/server/generators/graphicdictation/internal/worker"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer cancel()

	if err := worker.Run(ctx); err != nil {
		log.Fatalf("graphic dictation worker failed: %v", err)
	}
}
