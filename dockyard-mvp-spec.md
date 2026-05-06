# Dockyard Development Prompt

## 依頼

社内Webアプリ向けの軽量デプロイ基盤「Dockyard」と、各サーバ上で動作する「dockyard-agent」を新規作成してください。

目的は、Docker Compose化済みの社内Webアプリを、Git URLを指定するだけで自動的にcloneし、envを注入し、空いているサーバへデプロイできるようにすることです。

---

# 全体構成

作成するものは2つです。

1. dockyard
    - 管理Web UI
    - API
    - PostgreSQLによるアプリ・サーバ・デプロイ履歴・env管理
    - agentへのデプロイ指示
    - 将来的にDNS登録・リバプロ連携を追加できる設計

2. dockyard-agent
    - 各デプロイ対象サーバ上で常駐
    - dockyardからの指示を受けてGit clone / pull
    - `.env` を生成
    - `docker compose up -d --build` を実行
    - ヘルスチェック
    - サーバリソース情報をdockyardへ定期送信

---

# 技術スタック

## dockyard

- Next.js
- TypeScript
- App Router
- PostgreSQL
- Drizzle ORM
- Tailwind CSS
- shadcn/ui
- Server Actions or Route Handlers
- 認証は後から追加できる構成にする

## dockyard-agent

- Goで実装
- systemdで常駐できるCLI/daemon
- 設定ファイルは `/etc/dockyard-agent/config.yaml`
- 作業ディレクトリは `/opt/dockyard/apps`

---

# dockyardの主要機能

## 1. アプリ管理

アプリ登録画面を作成してください。

入力項目:

- app name
- Git URL
- branch
- domain
- compose file path
- public port
- health check path
- target server selection
    - auto
    - manual

登録したアプリは一覧表示できるようにしてください。

一覧に表示する項目:

- app name
- domain
- Git URL
- branch
- assigned server
- latest deployment status
- latest deployed commit
- updated at

---

## 2. env管理

アプリごとにenvをWeb UIから設定できるようにしてください。

env項目:

- key
- value
- is_secret
- required

`is_secret = true` の値は一覧ではマスク表示してください。

例:

```text
DATABASE_URL=********
NEXTAUTH_SECRET=********
NODE_ENV=production
```

DBには平文保存せず、暗号化して保存するためのサービス層を用意してください。

最初の実装では、`DOCKYARD_ENCRYPTION_KEY` を使ってAES-GCMで暗号化してください。

---

## 3. サーバ管理

サーバ一覧画面を作成してください。

表示項目:

- hostname
- ip address
- agent status
- CPU usage
- memory total
- memory used
- disk total
- disk used
- running app count
- last heartbeat

agentからheartbeat APIで更新される想定にしてください。

---

## 4. デプロイ

アプリ詳細画面に「Deploy」ボタンを作成してください。

押下時の処理:

1. 対象サーバを決定
    - manual指定があればそのサーバ
    - autoならリソース状況から選択
2. deploymentレコードを作成
3. agentへデプロイ指示を送信
4. deployment statusを更新

deployment status:

- queued
- running
- success
- failed

---

## 5. サーバ自動選定

最初は単純なスコアリングでよいです。

```text
score =
    free_memory_mb
  + free_disk_mb / 1024
  - running_app_count * 512
  - cpu_usage_percent * 10
```

statusがonlineのサーバのみ候補にしてください。

---

# dockyard-agentの主要機能

## 1. 設定ファイル

`/etc/dockyard-agent/config.yaml`

```yaml
agent_id: "server-01"
dockyard_url: "https://dockyard.example.local"
agent_token: "CHANGE_ME"
work_dir: "/opt/dockyard/apps"
heartbeat_interval_seconds: 30
```

---

## 2. heartbeat

定期的にdockyardへPOSTしてください。

endpoint:

```http
POST /api/agent/heartbeat
```

payload:

```json
{
    "agentId": "server-01",
    "hostname": "app01",
    "ipAddress": "192.168.10.21",
    "cpuUsagePercent": 23.5,
    "memoryTotalMb": 32768,
    "memoryUsedMb": 12000,
    "diskTotalMb": 512000,
    "diskUsedMb": 220000,
    "runningAppCount": 5
}
```

---

## 3. デプロイ指示の受信

最初の実装では、agent側がpollingする方式にしてください。

endpoint:

```http
GET /api/agent/jobs?agentId=server-01
```

jobがあれば取得して実行します。

job payload:

```json
{
    "jobId": "deploy_xxx",
    "deploymentId": "xxx",
    "appName": "checkmate",
    "gitUrl": "git@git.example.local:apps/checkmate.git",
    "branch": "main",
    "composeFile": "compose.yaml",
    "env": {
        "NODE_ENV": "production",
        "DATABASE_URL": "postgres://..."
    },
    "healthcheckUrl": "http://localhost:3000/api/health"
}
```

---

## 4. デプロイ処理

agentは以下を実行してください。

```text
/opt/dockyard/apps/{appName}/repo
```

がなければclone。

あればfetch/pull。

その後 `.env` を生成。

```bash
docker compose --env-file .env -f compose.yaml up -d --build
```

を実行。

成功後、healthcheckUrlへHTTP GET。

成功ならdeploymentをsuccessに更新。

失敗したらfailedに更新し、stderr/stdoutをdockyardへ送信。

---

## 5. ログ送信

deploy実行ログをdockyardへ送信してください。

endpoint:

```http
POST /api/agent/deployment-log
```

payload:

```json
{
    "deploymentId": "xxx",
    "level": "info",
    "message": "docker compose up completed"
}
```

---

# DB設計

Drizzleで以下のテーブルを作成してください。

## servers

- id
- agent_id
- hostname
- ip_address
- status
- cpu_usage_percent
- memory_total_mb
- memory_used_mb
- disk_total_mb
- disk_used_mb
- running_app_count
- last_heartbeat_at
- created_at
- updated_at

## apps

- id
- name
- git_url
- branch
- domain
- compose_file_path
- public_port
- healthcheck_path
- target_mode
    - auto
    - manual
- manual_server_id
- created_at
- updated_at

## app_env_vars

- id
- app_id
- key
- encrypted_value
- is_secret
- required
- created_at
- updated_at

## deployments

- id
- app_id
- server_id
- status
- git_ref
- commit_sha
- error_message
- started_at
- finished_at
- created_at

## deployment_logs

- id
- deployment_id
- level
- message
- created_at

## agent_jobs

- id
- agent_id
- deployment_id
- type
- status
- payload_json
- created_at
- picked_at
- finished_at

---

# API

以下のRoute Handlerを作成してください。

```text
GET    /api/apps
POST   /api/apps
GET    /api/apps/[id]
PATCH  /api/apps/[id]
DELETE /api/apps/[id]

GET    /api/apps/[id]/env
POST   /api/apps/[id]/env
PATCH  /api/apps/[id]/env/[envId]
DELETE /api/apps/[id]/env/[envId]

POST   /api/apps/[id]/deploy

GET    /api/servers
POST   /api/agent/heartbeat
GET    /api/agent/jobs
POST   /api/agent/jobs/[id]/complete
POST   /api/agent/deployment-log
```

---

# UI

最低限、以下の画面を作成してください。

```text
/
    ダッシュボード

/apps
    アプリ一覧

/apps/new
    アプリ登録

/apps/[id]
    アプリ詳細
    env一覧
    deployment履歴
    Deployボタン

/servers
    サーバ一覧

/deployments
    デプロイ履歴
```

UIはシンプルでよいですが、社内運用ツールとして見やすくしてください。

---

# セキュリティ要件

- agent APIはBearer Tokenで保護してください
- env secretはレスポンスで平文返却しないでください
- deploy job payloadをagentへ渡すときのみ復号してください
- shell command injectionを避けてください
- app nameはディレクトリ名に使うため、英数字・ハイフン・アンダースコアのみ許可してください
- Git URLは許可された形式のみ受け付けてください

---

# docker compose

dockyard本体用のcompose.yamlも作成してください。

services:

- dockyard
- postgres

環境変数:

```env
DATABASE_URL=
DOCKYARD_ENCRYPTION_KEY=
AGENT_SHARED_TOKEN=
```

---

# 成果物

以下を作成してください。

```text
dockyard/
    Next.js app

dockyard-agent/
    Go daemon

README.md
```

READMEには以下を書いてください。

- dockyardの起動方法
- DB migration方法
- agentのビルド方法
- agentのsystemd登録例
- アプリ登録からデプロイまでの流れ
- 現時点の制限事項

---

# 実装方針

まずはMVPとして動くことを優先してください。

DNS登録、Traefik連携、Apache conf生成は今回は実装しなくてよいですが、将来的に追加しやすいように service 層や interface を分けてください。

コードは可読性重視で、過度に抽象化しすぎないでください。

TypeScriptの型安全性を重視してください。

エラー処理とログは丁寧に実装してください。