package agent

import (
	"context"
	"fmt"
	"log"
	"time"

	"dockyard-agent/internal/config"
	"dockyard-agent/internal/runner"
)

type Agent struct {
	cfg    config.Config
	client *Client
}

func New(cfg config.Config) *Agent {
	return &Agent{
		cfg:    cfg,
		client: newClient(cfg),
	}
}

func (a *Agent) Run(ctx context.Context) error {
	if err := runner.EnsureWorkDir(a.cfg.WorkDir); err != nil {
		return err
	}

	heartbeatTicker := time.NewTicker(time.Duration(a.cfg.HeartbeatIntervalSeconds) * time.Second)
	defer heartbeatTicker.Stop()

	jobTicker := time.NewTicker(5 * time.Second)
	defer jobTicker.Stop()

	a.sendHeartbeat(ctx)
	a.pollJob(ctx)

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-heartbeatTicker.C:
			a.sendHeartbeat(ctx)
		case <-jobTicker.C:
			a.pollJob(ctx)
		}
	}
}

func (a *Agent) sendHeartbeat(ctx context.Context) {
	payload := collectHeartbeat(a.cfg)
	if err := a.client.sendHeartbeat(ctx, payload); err != nil {
		log.Printf("heartbeat failed: %v", err)
		return
	}
	log.Printf("heartbeat sent for %s", a.cfg.AgentID)
}

func (a *Agent) pollJob(ctx context.Context) {
	job, err := a.client.nextJob(ctx)
	if err != nil {
		log.Printf("job poll failed: %v", err)
		return
	}
	if job == nil {
		return
	}

	log.Printf("picked deploy job %s for %s", job.JobID, job.AppName)
	a.client.sendLog(ctx, job.DeploymentID, "info", fmt.Sprintf("Agent %s picked job %s.", a.cfg.AgentID, job.JobID))

	commitSHA, err := runner.Deploy(ctx, a.cfg.WorkDir, runner.DeployJob{
		AppName:              job.AppName,
		GitURL:               job.GitURL,
		Branch:               job.Branch,
		GeneratedComposeYAML: job.GeneratedComposeYAML,
		Env:                  job.Env,
		ManagedVolumes:       toRunnerManagedVolumes(job.ManagedVolumes),
		HealthcheckURL:       job.HealthcheckURL,
		Log: func(level, message string) {
			a.client.sendLog(ctx, job.DeploymentID, level, message)
		},
	})

	status := "success"
	errorMessage := ""
	if err != nil {
		status = "failed"
		errorMessage = err.Error()
		log.Printf("deploy job %s failed: %v", job.JobID, err)
	}

	if err := a.client.completeJob(ctx, job.JobID, completeJobPayload{
		DeploymentID: job.DeploymentID,
		Status:       status,
		CommitSHA:    commitSHA,
		ErrorMessage: errorMessage,
	}); err != nil {
		log.Printf("complete job failed: %v", err)
	}
}

func toRunnerManagedVolumes(volumes []managedVolume) []runner.ManagedVolume {
	result := make([]runner.ManagedVolume, 0, len(volumes))
	for _, volume := range volumes {
		result = append(result, runner.ManagedVolume{
			Name:      volume.Name,
			Backend:   volume.Backend,
			HostPath:  volume.HostPath,
			MountPath: volume.MountPath,
		})
	}
	return result
}
