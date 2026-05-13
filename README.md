# Dockyard

Dockyard is an MVP internal PaaS control plane for deploying trusted Dockerfile-based web apps to registered servers through a lightweight polling agent.

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
DOCKYARD_APP_SCHEME=http
TRAEFIK_ENTRYPOINTS=web
# TRAEFIK_DOCKER_NETWORK=traefik_proxy
# TRAEFIK_TLS=true
# TRAEFIK_CERT_RESOLVER=letsencrypt
# PDNS_API_URL=http://127.0.0.1:8081/api/v1
# PDNS_API_KEY=replace-with-pdns-api-key
# PDNS_SERVER_ID=localhost
# PDNS_ZONE_ID=example.local.
# PDNS_RECORD_TTL=60
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

## Deployment Model

Dockyard no longer runs application repository `compose.yaml` files in production. Apps should keep a Dockerfile and application code in the repository; Dockyard stores the runtime/build settings, managed volumes, resource bindings, placement policy, and host port assignment in its own database.

At deploy time the control plane generates the compose YAML and `.env` payload from Dockyard app config, then sends them to the target agent. The agent writes:

```text
/opt/dockyard/apps/{appName}/generated/compose.yaml
/opt/dockyard/apps/{appName}/generated/.env
```

and runs:

```bash
docker compose \
  -f /opt/dockyard/apps/{appName}/generated/compose.yaml \
  --env-file /opt/dockyard/apps/{appName}/generated/.env \
  -p dockyard_{appName} \
  up -d --build
```

The legacy compose file path remains in app settings for compatibility, but it is deprecated and is not used by the production deploy path.

Generated compose files include Traefik Docker provider labels for each app domain:

- `traefik.enable=true`
- `traefik.http.routers.<app>.rule=Host(\`app.example.local\`)`
- `traefik.http.routers.<app>.entrypoints=$TRAEFIK_ENTRYPOINTS`
- `traefik.http.services.<app>.loadbalancer.server.port=<containerPort>`

Set `TRAEFIK_DOCKER_NETWORK` when Traefik uses a shared external Docker network; Dockyard will attach the generated app service to that network and add `traefik.docker.network`.

When `PDNS_API_URL`, `PDNS_API_KEY`, and `PDNS_ZONE_ID` are configured, queuing a deployment also updates PowerDNS through the Authoritative Server HTTP API. Dockyard writes an A or AAAA record for the app domain to the selected server heartbeat IP address before queuing the agent job.

## Resources

Resource Providers are shared infrastructure registrations for PostgreSQL, S3-compatible storage such as MinIO, Elasticsearch, and future Redis support. Provider admin credentials are encrypted with `DOCKYARD_ENCRYPTION_KEY` using the same AES-GCM helper as app env values.

Resource Bindings attach an app to a provider and can generate deployment env values. PostgreSQL auto-create is implemented for the MVP:

1. Create the database if missing.
2. Create or update the app role with a generated password.
3. Grant database and public schema privileges.
4. Store generated secrets encrypted.
5. Inject the generated `DATABASE_URL` into the deploy env.

S3 / MinIO and Elasticsearch provider/binding records are available in the UI. Elasticsearch currently supports fallback env injection for URL and index prefix; S3 / MinIO automatic bucket and access-key provisioning is still a limitation.

Generated resource env wins over manual env when keys collide. Manual app env wins over runtime defaults.

## Managed Volumes And Placement

Dockyard only supports managed volumes. Arbitrary host bind mounts, privileged containers, host networking, Docker socket mounts, custom `container_name`, `cap_add`, `devices`, `extra_hosts`, and user-supplied `network_mode` are not generated by Dockyard.

Local managed volumes are mounted from:

```text
/opt/dockyard/volumes/{appName}/{volumeName}
```

Local volumes are not movable, so apps using them must use `manual` or `pinned` placement. `pinned` placement keeps the first deployed server for later deploys. `auto` placement is intended for stateless apps or apps whose persistent state is already externalized through shared resources or NFS.

NFS managed volumes generate Docker local driver options and can be movable when the NFS export is shared across hosts.

## Deployment Flow

1. Start Dockyard and run migrations.
2. Start one or more `dockyard-agent` daemons with the same `AGENT_SHARED_TOKEN`.
3. Confirm agents appear on `/servers` after heartbeat.
4. Register an app on `/apps/new`.
5. Configure runtime settings, resource bindings, managed volumes, and manual env values on the app detail page.
6. Press `Deploy`.
7. Dockyard prepares resource bindings, merges env values, generates compose YAML, and queues an agent job.
8. The target agent polls `/api/agent/jobs`, clones or updates the repo, creates managed local volume directories, writes generated compose and env files, runs Docker Compose, performs the health check, sends logs, and completes the job.

## Current Limitations

- Authentication for the Dockyard web UI is intentionally left as a future layer.
- Agent APIs use one shared Bearer token for the MVP.
- Server auto-selection only uses the simple score from the spec.
- TLS automation depends on the configured Traefik entrypoint/cert resolver and is not managed directly by Dockyard.
- Deployment logs are stored and visible through DB/API plumbing, but the UI currently shows deployment history rather than a full log viewer.
- CPU and memory metrics in the agent are Linux `/proc` based; non-Linux development machines report partial metrics.
- Dockerfile builds still run trusted repository code. Dockyard is intended for trusted internal repositories, not arbitrary untrusted code.
- S3 / MinIO automatic bucket, service-account, and policy provisioning is not implemented yet.
- Elasticsearch API-key provisioning is not implemented yet; the MVP can inject URL and index-prefix env values.
