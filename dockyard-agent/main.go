package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"syscall"

	"dockyard-agent/internal/agent"
	"dockyard-agent/internal/config"
)

func main() {
	configPath := flag.String("config", "/etc/dockyard-agent/config.yaml", "path to dockyard-agent config")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	runner := agent.New(cfg)
	if err := runner.Run(ctx); err != nil {
		log.Fatalf("agent stopped: %v", err)
	}
}
