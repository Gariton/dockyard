package agent

type heartbeatPayload struct {
	AgentID         string  `json:"agentId"`
	Hostname        string  `json:"hostname"`
	IPAddress       string  `json:"ipAddress"`
	CPUUsagePercent float64 `json:"cpuUsagePercent"`
	MemoryTotalMB   int64   `json:"memoryTotalMb"`
	MemoryUsedMB    int64   `json:"memoryUsedMb"`
	DiskTotalMB     int64   `json:"diskTotalMb"`
	DiskUsedMB      int64   `json:"diskUsedMb"`
	RunningAppCount int     `json:"runningAppCount"`
}

type jobEnvelope struct {
	Job *deployJob `json:"job"`
}

type deployJob struct {
	JobID                string            `json:"jobId"`
	DeploymentID         string            `json:"deploymentId"`
	AppName              string            `json:"appName"`
	GitURL               string            `json:"gitUrl"`
	Branch               string            `json:"branch"`
	GeneratedComposeYAML string            `json:"generatedComposeYaml"`
	Env                  map[string]string `json:"env"`
	ManagedVolumes       []managedVolume   `json:"managedVolumes"`
	HealthcheckURL       string            `json:"healthcheckUrl"`
}

type managedVolume struct {
	Name      string `json:"name"`
	Backend   string `json:"backend"`
	HostPath  string `json:"hostPath,omitempty"`
	MountPath string `json:"mountPath"`
}

type deploymentLogPayload struct {
	DeploymentID string `json:"deploymentId"`
	Level        string `json:"level"`
	Message      string `json:"message"`
}

type completeJobPayload struct {
	DeploymentID string `json:"deploymentId"`
	Status       string `json:"status"`
	CommitSHA    string `json:"commitSha,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}
