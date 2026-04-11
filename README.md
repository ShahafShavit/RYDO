# RYDO

Monorepo for the RYDO cycling platform: a **Vite + React** client under [`client/`](client/) and a **.NET 9** API under [`server/`](server/). See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md) for architecture and run instructions.

## Run the full stack

REST routes live under **`/api`** (for example `POST /api/auth/login`) so the SPA can use the same host for HTML routes (`/routes`, `/clubs`, …) without colliding with JSON endpoints.

### Option A — One URL (Docker Compose, full image)

[`docker-compose.yml`](docker-compose.yml) builds the **root** [`Dockerfile`](Dockerfile): Vite production build is copied into `wwwroot`, and **Kestrel** serves the SPA and the API on one port.

From the repository root:

```bash
docker compose up --build
```

- **App + API:** [http://localhost:5000](http://localhost:5000) (container port 8080)
- **Health check:** `GET http://localhost:5000/health`
- **SQL Server:** host port **1433** (login `sa`, password `Your_password123` — defined in [`docker-compose.yml`](docker-compose.yml))

The API retries database startup while SQL Server comes up. For a detached run, use `docker compose up --build -d`. To stop and remove containers, `docker compose down`; to wipe the database and re-seed on next start, `docker compose down -v`.

### Option B — Vite dev server + API in Docker

Run Compose as above, then in a second terminal:

```bash
cd client
npm install
npm run dev
```

Point the client at the API with [`client/.env.local`](client/.env.local):

```env
VITE_API_MODE=real
VITE_API_BASE_URL=http://localhost:5000
```

Open the URL Vite prints (typically [http://localhost:5173](http://localhost:5173)). Requests go to `http://localhost:5000/api/...`.

More API-only detail (local `dotnet run`, CORS notes) is in [`server/README.md`](server/README.md).

## Deploy to AWS (minimal school stack)

CDK app under [`infra/`](infra/): **ECR**, **ECS Fargate** (app + ephemeral SQL Server sidecar), **ALB**, **CloudFront**. Database data is **not** persisted across task restarts; the app **creates and seeds** the database on startup (same idea as local Docker).

See [`infra/README.md`](infra/README.md) for `cdk deploy`, pushing the image to ECR, and `cdk destroy`.

**One-command deploy (after config):** copy [`infra/deploy.env.example`](infra/deploy.env.example) to `infra/deploy.env`, set `AWS_REGION`, then run `bash scripts/deploy-aws.sh` (Git Bash / WSL / macOS/Linux). It runs CDK deploy, Docker build, ECR push, and ECS force new deployment using your region from the config file.

## Hint: seeded admin and user logins (local API)

After the database is first created (e.g. Docker Compose with a fresh SQL volume), the API seeds two accounts you can use in the UI or against `POST /api/auth/login`:

| Email | Password | Role |
|--------|----------|------|
| `admin@rydo.test` | `Admin123!` | admin |
| `user@rydo.test` | `User123!` | user |

Additional **demo riders** (`rider003@rydo.test` … `rider036@rydo.test`, same password as `user@rydo.test`) are seeded so lists and metrics look populated—see [`server/Rydo.Api/Data/DbSeeder.cs`](server/Rydo.Api/Data/DbSeeder.cs). To re-seed, wipe the DB volume (e.g. `docker compose down -v`) and start again.

These are **development-only** credentials; change or remove them for any real deployment.
