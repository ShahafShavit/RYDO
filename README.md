# RYDO

Monorepo for the RYDO cycling platform: a **Vite + React** client under [`client/`](client/) and a **.NET 9** API under [`server/`](server/). See [`client/README.md`](client/README.md) and [`server/README.md`](server/README.md) for architecture and run instructions.

## Hint: seeded admin and user logins (local API)

After the database is first created (e.g. Docker Compose with a fresh SQL volume), the API seeds two accounts you can use in the UI or against `POST /api/auth/login`:

| Email | Password | Role |
|--------|----------|------|
| `admin@rydo.test` | `Admin123!` | admin |
| `user@rydo.test` | `User123!` | user |

Additional **demo riders** (`rider003@rydo.test` … `rider036@rydo.test`, same password as `user@rydo.test`) are seeded so lists and metrics look populated—see [`server/Rydo.Api/Data/DbSeeder.cs`](server/Rydo.Api/Data/DbSeeder.cs). To re-seed, wipe the DB volume (e.g. `docker compose down -v`) and start again.

These are **development-only** credentials; change or remove them for any real deployment.

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

### Pause AWS compute (scale ECS to zero)

To **stop Fargate billing** while leaving the stack in place (ECR, ALB, CloudFront, logs), scale the ECS service to **no running tasks**. This is the practical “off switch” for compute; the load balancer and CloudFront still incur smaller ongoing charges.

**Can you scale “everything” to zero, including the ALB?** Not with a single toggle. **ECS** supports **`desiredCount = 0`** (no tasks). An **Application Load Balancer** does not have a scale-to-zero mode: if it exists, AWS bills it **per hour** plus LCU. To stop paying for the ALB (and CloudFront, VPC-related charges, etc.), you **remove** those resources—typically **`cdk destroy`** for this project—or automate **delete** operations that must be undone before the app works again. There is no supported “pause ALB” comparable to stopping ECS tasks.

From the repo root (same `infra/deploy.env` as deploy):

```bash
bash scripts/ecs-scale.sh status   # desired / running counts + recent events
bash scripts/ecs-scale.sh off      # desiredCount 0, wait until stable, verify
bash scripts/ecs-scale.sh on       # desiredCount back to 1 (or DESIRED_COUNT_ON in deploy.env)
```

A full **`cdk deploy`** can reset **`desiredCount`** to the value in [`infra/lib/rydo-stack.ts`](infra/lib/rydo-stack.ts) (currently `1`). Use **`SKIP_CDK_DEPLOY=1`** when you only build/push/roll the service, or run **`ecs-scale.sh off`** again after an infra deploy if you want the service to stay scaled down.

More detail: [`infra/README.md`](infra/README.md).

### AWS cost expectations (rough guide)

Figures are **On-Demand list prices** from the AWS Price List API, rounded for **EU (Frankfurt) `eu-central-1`**, **one Fargate task** at **2 vCPU / 8 GiB** and **desired count 1** (~730 hours/month). Actual invoices vary with traffic, taxes, and price changes—use the [AWS Pricing Calculator](https://calculator.aws/) before committing.

| Item | Approximate steady state |
|------|---------------------------|
| **ECS Fargate** (Linux x86, 2 vCPU + 8 GiB) | ~**$98/mo** compute |
| **Application Load Balancer** | ~**$20/mo** per ALB-hour + **LCU** usage (often ~**$5–15/mo** at light load) |
| **CloudFront** | Highly variable: data transfer out (EU price sheet, first 10 TB tier about **$0.085/GB**) plus HTTPS requests; the CDK stack uses **caching disabled**, so costs track usage closely |
| **ECR** image storage | Often **under $1/mo** for a small image (~**$0.10/GB-mo** in Frankfurt) |
| **CloudWatch Logs** (container logs) | Often **~$1–5/mo** at modest volume (ingestion priced per GB) |

**Order of magnitude:** about **$120–$150/mo** for an always-on, low-traffic deployment in Frankfurt, **before** large CDN egress or heavy traffic. **No NAT gateways** in this stack (public subnets only), which avoids that fixed cost.

**Scaled to zero:** setting **`desiredCount` to 0** removes **Fargate** charges; **ALB**, **CloudFront**, **ECR**, and **logs** can still bill. **Destroying the stack** (`cdk destroy`) removes those recurring resources (after emptying ECR if required).
