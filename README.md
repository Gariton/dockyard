# Dockyard

Dockyard is an MVP control plane for deploying internal Docker Compose web apps to registered servers through a lightweight polling agent.

## Structure

```text
dockyard/
  Next.js App Router UI/API
dockyard-agent/
  Go daemon for target servers
compose.yaml
  local Dockyard + PostgreSQL stack
```

## Start Dockyard

```bash
cd dockyard
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

The app runs on `http://localhost:3000`.

For Docker Compose:

```bash
docker compose up --build
```

Run migrations against the compose PostgreSQL instance:

```bash
cd dockyard
DATABASE_URL=postgres://dockyard:dockyard@localhost:5432/dockyard npm run db:migrate
```

## Start PostgreSQL With `container`

On macOS environments without Docker, Dockyard can use Apple's `container` CLI for PostgreSQL:

```bash
container system start
container run -d --name dockyard-postgres \
  -e POSTGRES_DB=dockyard \
  -e POSTGRES_USER=dockyard \
  -e POSTGRES_PASSWORD=dockyard \
  postgres:17-alpine
container ls --all
```

Use the `ADDR` shown by `container ls --all` in `DATABASE_URL`, for example:

```env
DATABASE_URL=postgres://dockyard:dockyard@192.168.64.2:5432/dockyard
DOCKYARD_ENCRYPTION_KEY=dev-only-change-me
AGENT_SHARED_TOKEN=dev-agent-token
```

Then run:

```bash
cd dockyard
npm run db:migrate
npm run dev
```

## Database Migrations

Drizzle schema lives in `dockyard/src/db/schema.ts`.

```bash
cd dockyard
npm run db:generate
npm run db:migrate
```

Required environment variables:

```env
DATABASE_URL=postgres://dockyard:dockyard@localhost:5432/dockyard
DOCKYARD_ENCRYPTION_KEY=replace-with-a-long-random-string
AGENT_SHARED_TOKEN=replace-with-agent-token
```

`DOCKYARD_ENCRYPTION_KEY` is used to derive an AES-256-GCM key for encrypted env values.

## Build The Agent

```bash
cd dockyard-agent
go mod tidy
go build -o dockyard-agent ./...
```

Example config:

```bash
sudo mkdir -p /etc/dockyard-agent
sudo cp config.example.yaml /etc/dockyard-agent/config.yaml
sudo install -m 0755 dockyard-agent /usr/local/bin/dockyard-agent
```

Edit `/etc/dockyard-agent/config.yaml`:

```yaml
agent_id: "server-01"
dockyard_url: "https://dockyard.example.local"
agent_token: "CHANGE_ME"
work_dir: "/opt/dockyard/apps"
heartbeat_interval_seconds: 30
```

## systemd Example

```bash
sudo cp dockyard-agent.service /etc/systemd/system/dockyard-agent.service
sudo systemctl daemon-reload
sudo systemctl enable --now dockyard-agent
sudo systemctl status dockyard-agent
```

## Deployment Flow

1. Start Dockyard and run migrations.
2. Start one or more `dockyard-agent` daemons with the same `AGENT_SHARED_TOKEN`.
3. Confirm agents appear on `/servers` after heartbeat.
4. Register an app on `/apps/new`.
5. Add env values on the app detail page. Secret values are stored encrypted and masked in UI/API responses.
6. Press `Deploy`.
7. Dockyard creates a deployment and a queued agent job.
8. The target agent polls `/api/agent/jobs`, clones or updates the repo, writes `.env`, runs `docker compose --env-file .env -f compose.yaml up -d --build`, performs the health check, sends logs, and completes the job.

## Current Limitations

- Authentication for the Dockyard web UI is intentionally left as a future layer.
- Agent APIs use one shared Bearer token for the MVP.
- Server auto-selection only uses the simple score from the spec.
- DNS registration, reverse proxy integration, Traefik/Apache config generation, and TLS automation are not implemented yet.
- Deployment logs are stored and visible through DB/API plumbing, but the UI currently shows deployment history rather than a full log viewer.
- CPU and memory metrics in the agent are Linux `/proc` based; non-Linux development machines report partial metrics.
