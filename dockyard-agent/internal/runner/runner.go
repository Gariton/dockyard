package runner

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

type DeployJob struct {
	AppName        string
	GitURL         string
	Branch         string
	ComposeFile    string
	Env            map[string]string
	HealthcheckURL string
	Log            func(level, message string)
}

var (
	appNamePattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
	relPathPattern = regexp.MustCompile(`^[A-Za-z0-9._/-]+$`)
	envKeyPattern  = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
)

func EnsureWorkDir(workDir string) error {
	return os.MkdirAll(workDir, 0o755)
}

func Deploy(ctx context.Context, workDir string, job DeployJob) (string, error) {
	if err := validateJob(job); err != nil {
		return "", err
	}

	appDir := filepath.Join(workDir, job.AppName)
	repoDir := filepath.Join(appDir, "repo")
	if err := EnsureWorkDir(appDir); err != nil {
		return "", err
	}

	if _, err := os.Stat(filepath.Join(repoDir, ".git")); errors.Is(err, os.ErrNotExist) {
		job.log("info", "Cloning repository.")
		if err := run(ctx, "", "git", "clone", "--branch", job.Branch, "--single-branch", job.GitURL, repoDir); err != nil {
			return "", err
		}
	} else {
		job.log("info", "Updating repository.")
		if err := run(ctx, repoDir, "git", "fetch", "origin", job.Branch); err != nil {
			return "", err
		}
		if err := run(ctx, repoDir, "git", "checkout", job.Branch); err != nil {
			return "", err
		}
		if err := run(ctx, repoDir, "git", "pull", "--ff-only", "origin", job.Branch); err != nil {
			return "", err
		}
	}

	if err := writeEnvFile(filepath.Join(repoDir, ".env"), job.Env); err != nil {
		return "", err
	}
	job.log("info", ".env generated.")

	if err := run(ctx, repoDir, "docker", "compose", "--env-file", ".env", "-f", job.ComposeFile, "up", "-d", "--build"); err != nil {
		return "", err
	}
	job.log("info", "docker compose up completed.")

	commitSHA, err := output(ctx, repoDir, "git", "rev-parse", "HEAD")
	if err != nil {
		return "", err
	}
	commitSHA = strings.TrimSpace(commitSHA)

	if err := healthcheck(ctx, job.HealthcheckURL); err != nil {
		return commitSHA, err
	}
	job.log("info", "health check passed.")

	return commitSHA, nil
}

func validateJob(job DeployJob) error {
	if !appNamePattern.MatchString(job.AppName) {
		return fmt.Errorf("invalid app name %q", job.AppName)
	}
	if job.Branch == "" || strings.Contains(job.Branch, "..") || strings.HasPrefix(job.Branch, "-") {
		return fmt.Errorf("invalid branch %q", job.Branch)
	}
	if !relPathPattern.MatchString(job.ComposeFile) || filepath.IsAbs(job.ComposeFile) || strings.Contains(job.ComposeFile, "..") {
		return fmt.Errorf("invalid compose file %q", job.ComposeFile)
	}
	if job.GitURL == "" {
		return fmt.Errorf("git URL is required")
	}
	if job.HealthcheckURL == "" {
		return fmt.Errorf("healthcheck URL is required")
	}
	return nil
}

func writeEnvFile(path string, env map[string]string) error {
	keys := make([]string, 0, len(env))
	for key := range env {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		if !envKeyPattern.MatchString(key) {
			return fmt.Errorf("invalid env key %q", key)
		}
		value := strings.ReplaceAll(env[key], "\n", `\n`)
		lines = append(lines, key+"="+value)
	}

	return os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o600)
}

func run(ctx context.Context, dir, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	trimmed := strings.TrimSpace(string(output))
	if err != nil {
		if trimmed == "" {
			return fmt.Errorf("%s failed: %w", name, err)
		}
		return fmt.Errorf("%s failed: %w: %s", name, err, trimmed)
	}
	return nil
}

func output(ctx context.Context, dir, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	data, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func healthcheck(ctx context.Context, healthcheckURL string) error {
	client := http.Client{Timeout: 8 * time.Second}
	var lastErr error

	for i := 0; i < 10; i++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthcheckURL, nil)
		if err != nil {
			return err
		}
		resp, err := client.Do(req)
		if err == nil {
			_ = resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 400 {
				return nil
			}
			lastErr = fmt.Errorf("healthcheck returned %s", resp.Status)
		} else {
			lastErr = err
		}
		time.Sleep(3 * time.Second)
	}

	return fmt.Errorf("healthcheck failed: %w", lastErr)
}

func (job DeployJob) log(level, message string) {
	if job.Log != nil {
		job.Log(level, message)
	}
}
