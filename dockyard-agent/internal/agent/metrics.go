package agent

import (
	"bufio"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"dockyard-agent/internal/config"
)

func collectHeartbeat(cfg config.Config) heartbeatPayload {
	hostname, _ := os.Hostname()
	memTotal, memUsed := readMemoryMB()
	diskTotal, diskUsed := readDiskMB(cfg.WorkDir)

	return heartbeatPayload{
		AgentID:         cfg.AgentID,
		Hostname:        hostname,
		IPAddress:       primaryIP(),
		CPUUsagePercent: readCPUPercent(),
		MemoryTotalMB:   memTotal,
		MemoryUsedMB:    memUsed,
		DiskTotalMB:     diskTotal,
		DiskUsedMB:      diskUsed,
		RunningAppCount: countRunningApps(cfg.WorkDir),
	}
}

func primaryIP() string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return "127.0.0.1"
	}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			ip := ipNet.IP.To4()
			if ip != nil {
				return ip.String()
			}
		}
	}
	return "127.0.0.1"
}

func readMemoryMB() (int64, int64) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, 0
	}
	defer file.Close()

	values := map[string]int64{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}
		value, err := strconv.ParseInt(fields[1], 10, 64)
		if err == nil {
			values[strings.TrimSuffix(fields[0], ":")] = value
		}
	}

	total := values["MemTotal"] / 1024
	available := values["MemAvailable"] / 1024
	used := total - available
	if used < 0 {
		used = 0
	}
	return total, used
}

func readDiskMB(path string) (int64, int64) {
	_ = os.MkdirAll(path, 0o755)
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0
	}
	total := int64(stat.Blocks) * int64(stat.Bsize) / 1024 / 1024
	free := int64(stat.Bavail) * int64(stat.Bsize) / 1024 / 1024
	used := total - free
	if used < 0 {
		used = 0
	}
	return total, used
}

func readCPUPercent() float64 {
	idle1, total1, err := readProcStat()
	if err != nil {
		return 0
	}
	time.Sleep(150 * time.Millisecond)
	idle2, total2, err := readProcStat()
	if err != nil {
		return 0
	}
	totalDelta := total2 - total1
	if totalDelta <= 0 {
		return 0
	}
	idleDelta := idle2 - idle1
	return (1 - float64(idleDelta)/float64(totalDelta)) * 100
}

func readProcStat() (idle, total uint64, err error) {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0, 0, err
	}
	line := strings.SplitN(string(data), "\n", 2)[0]
	fields := strings.Fields(line)
	if len(fields) < 5 || fields[0] != "cpu" {
		return 0, 0, os.ErrInvalid
	}
	for i, field := range fields[1:] {
		value, parseErr := strconv.ParseUint(field, 10, 64)
		if parseErr != nil {
			return 0, 0, parseErr
		}
		total += value
		if i == 3 || i == 4 {
			idle += value
		}
	}
	return idle, total, nil
}

func countRunningApps(workDir string) int {
	entries, err := os.ReadDir(workDir)
	if err != nil {
		return 0
	}
	count := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if _, err := os.Stat(filepath.Join(workDir, entry.Name(), "repo")); err == nil {
			count++
		}
	}
	return count
}
