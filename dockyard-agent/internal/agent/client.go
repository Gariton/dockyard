package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"dockyard-agent/internal/config"
)

type Client struct {
	cfg        config.Config
	httpClient *http.Client
}

func newClient(cfg config.Config) *Client {
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) postJSON(ctx context.Context, path string, payload any, out any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.DockyardURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.AgentToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return decodeResponse(resp, out)
}

func (c *Client) sendHeartbeat(ctx context.Context, payload heartbeatPayload) error {
	return c.postJSON(ctx, "/api/agent/heartbeat", payload, nil)
}

func (c *Client) nextJob(ctx context.Context) (*deployJob, error) {
	endpoint := c.cfg.DockyardURL + "/api/agent/jobs?agentId=" + url.QueryEscape(c.cfg.AgentID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.cfg.AgentToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var envelope jobEnvelope
	if err := decodeResponse(resp, &envelope); err != nil {
		return nil, err
	}

	return envelope.Job, nil
}

func (c *Client) sendLog(ctx context.Context, deploymentID, level, message string) {
	payload := deploymentLogPayload{
		DeploymentID: deploymentID,
		Level:        level,
		Message:      message,
	}
	if err := c.postJSON(ctx, "/api/agent/deployment-log", payload, nil); err != nil {
		fmt.Printf("send deployment log failed: %v\n", err)
	}
}

func (c *Client) completeJob(ctx context.Context, jobID string, payload completeJobPayload) error {
	return c.postJSON(ctx, "/api/agent/jobs/"+url.PathEscape(jobID)+"/complete", payload, nil)
}

func decodeResponse(resp *http.Response, out any) error {
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("dockyard returned %s: %s", resp.Status, string(data))
	}
	if out == nil || len(data) == 0 {
		return nil
	}
	return json.Unmarshal(data, out)
}
