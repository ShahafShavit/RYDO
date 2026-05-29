# RYDO AWS (CDK)

Deploys **ECR**, **ECS Fargate** (app container + SQL Server sidecar), **ALB**, and **CloudFront** (HTTPS viewer → HTTP to ALB).

## Prerequisites

- AWS CLI configured (`aws sts get-caller-identity`)
- CDK bootstrapped in the account/region: `npx cdk bootstrap aws://ACCOUNT/REGION`
- Docker (build and push the app image)

## Deploy

From the **repository root** (AWS CLI credentials + Docker required):

```bash
bash scripts/deploy-aws.sh
```

This bootstraps CDK if needed, deploys infra when it changed, builds the app image, pushes to ECR, starts ECS tasks, waits for stability, and verifies `/health`.

Optional overrides in `infra/deploy.env` (region, profile, Mapbox token). If the file is missing, region/profile come from `aws configure`.

Stack outputs include **`EcsClusterName`** and **`EcsServiceName`** so the script does not need hard-coded resource names.

## Pause or resume ECS (scale to zero)

[`scripts/ecs-scale.sh`](../scripts/ecs-scale.sh) (run from the **repository root**) uses the same `deploy.env` and CloudFormation outputs as `deploy-aws.sh`:

| Command | What it does |
|---------|----------------|
| `bash scripts/ecs-scale.sh status` | Prints desired/running/pending counts, deployment count, and recent ECS service events. |
| `bash scripts/ecs-scale.sh off` | Sets **desiredCount** to **0**, waits until the service is **stable**, then verifies desired and running counts are **0**. |
| `bash scripts/ecs-scale.sh on` | Sets **desiredCount** to **`DESIRED_COUNT_ON`** (default **1** in `deploy.env.example`), waits until stable, verifies counts. |

Optional in `deploy.env`: **`DESIRED_COUNT_ON`** (integer ≥ 1) if you change desired capacity in the CDK template later.

**Note:** A full **`cdk deploy`** resets **desiredCount** to **`0`** in `lib/rydo-stack.ts` (so deploy does not block on an empty ECR). **`deploy-aws.sh`** scales back up after push; use **`ecs-scale.sh off`** if you want tasks stopped without destroying the stack.

**Cost:** scaling to **0** stops **Fargate** charges; **ALB**, **CloudFront**, **ECR** storage, and **CloudWatch** can still incur fees until the stack is destroyed. Approximate monthly costs when running are summarized in the root [`README.md`](../README.md).

**ALB:** there is no **scale-to-zero** for a load balancer. While the ALB exists, it is billed hourly. Removing it means deleting the resource (or tearing down the stack), not an ECS-style desired count.

## Deploy (manual steps)

From `infra/`:

```bash
npm install
npx cdk deploy
```

The ECS service is created with **`desiredCount: 0`** so `cdk deploy` does not wait on tasks while ECR is still empty. `scripts/deploy-aws.sh` builds and pushes `latest`, then sets desired count (default **1**) and waits for the service to stabilize.

For a manual deploy without the script: push `latest` first, then set the service desired count to **1** and force a new deployment.

From the repository root (after `cdk deploy` once so ECR exists):

```bash
# Build full-stack image (Vite + API)
docker build -t rydo-app:latest -f Dockerfile .

# Login and push (replace REGION and ACCOUNT from ECR URI)
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker tag rydo-app:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/rydo-app:latest
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/rydo-app:latest
```

After the image is in ECR, force a new ECS deployment (the script does this automatically).

## Outputs

- **CloudFrontUrl** — public HTTPS URL (use this in the browser and as `VITE_API_BASE_URL` for production mobile builds).
- **AlbDns** — direct HTTP to the load balancer (debugging).

Mobile store publishing (after deploy): [../docs/deploy-and-publish.md](../docs/deploy-and-publish.md).

## Tear down

```bash
npx cdk destroy
```

Empty the ECR repository first if `destroy` fails on repository-not-empty.

## Verification (receipts)

- `npx cdk synth` — template compiles.
- After deploy: `aws cloudformation describe-stacks --stack-name RydoStack`, `curl -s https://<cloudfront>/health`.
