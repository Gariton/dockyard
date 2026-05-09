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

See the repository root `README.md` for the full Dockyard + agent workflow.
