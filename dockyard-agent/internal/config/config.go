package config

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AgentID                  string `yaml:"agent_id"`
	DockyardURL              string `yaml:"dockyard_url"`
	AgentToken               string `yaml:"agent_token"`
	WorkDir                  string `yaml:"work_dir"`
	HeartbeatIntervalSeconds int    `yaml:"heartbeat_interval_seconds"`
}

func Load(path string) (Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return Config{}, err
	}
	defer file.Close()

	cfg := Config{
		WorkDir:                  "/opt/dockyard/apps",
		HeartbeatIntervalSeconds: 30,
	}

	if err := parseSimpleYAML(file, &cfg); err != nil {
		return Config{}, err
	}

	cfg.DockyardURL = strings.TrimRight(cfg.DockyardURL, "/")

	if cfg.AgentID == "" {
		return Config{}, fmt.Errorf("agent_id is required")
	}
	if cfg.DockyardURL == "" {
		return Config{}, fmt.Errorf("dockyard_url is required")
	}
	if cfg.AgentToken == "" {
		return Config{}, fmt.Errorf("agent_token is required")
	}
	if cfg.WorkDir == "" {
		return Config{}, fmt.Errorf("work_dir is required")
	}
	if cfg.HeartbeatIntervalSeconds <= 0 {
		cfg.HeartbeatIntervalSeconds = 30
	}

	return cfg, nil
}

func parseSimpleYAML(file *os.File, cfg *Config) error {
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, ":")
		if !ok {
			return fmt.Errorf("invalid config line %q", line)
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"'`)

		switch key {
		case "agent_id":
			cfg.AgentID = value
		case "dockyard_url":
			cfg.DockyardURL = value
		case "agent_token":
			cfg.AgentToken = value
		case "work_dir":
			cfg.WorkDir = value
		case "heartbeat_interval_seconds":
			seconds, err := strconv.Atoi(value)
			if err != nil {
				return fmt.Errorf("invalid heartbeat_interval_seconds: %w", err)
			}
			cfg.HeartbeatIntervalSeconds = seconds
		default:
			return fmt.Errorf("unknown config key %q", key)
		}
	}
	return scanner.Err()
}
