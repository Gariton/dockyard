# Dockyard Web

Next.js App Router control plane for Dockyard.

Dockyard stores app runtime/build settings and generates production compose files itself. Repository `compose.yaml` paths are deprecated compatibility metadata and are not executed by the agent deploy path.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Optional routing/DNS settings:

```env
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

Generated app compose files include Traefik Docker labels. If PowerDNS settings are present, deployments update the app domain A/AAAA record to the selected server IP before queuing the agent job.

See the repository root `README.md` for the full Dockyard + agent workflow.
