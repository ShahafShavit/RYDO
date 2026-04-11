# RYDO AWS (CDK)

Deploys **ECR**, **ECS Fargate** (app container + SQL Server sidecar), **ALB**, and **CloudFront** (HTTPS viewer → HTTP to ALB).

## Prerequisites

- AWS CLI configured (`aws sts get-caller-identity`)
- CDK bootstrapped in the account/region: `npx cdk bootstrap aws://ACCOUNT/REGION`
- Docker (build and push the app image)

## Deploy (script + config file)

1. Copy `deploy.env.example` to `deploy.env` and set **`AWS_REGION`** (and optional **`AWS_PROFILE`**).
2. From the **repository root**:

```bash
bash scripts/deploy-aws.sh
```

This runs `cdk deploy`, builds the root `Dockerfile`, logs in to ECR, pushes `rydo-app:latest`, and forces a new ECS deployment. Stack outputs include **`EcsClusterName`** and **`EcsServiceName`** so the script does not need hard-coded resource names.

- **`SKIP_CDK_DEPLOY=1`** in `deploy.env` — only build, push, and roll ECS (infra already deployed).
- First time in an account/region, run **`npx cdk bootstrap`** once (from `infra/` or with the same `AWS_REGION` / profile).

## Deploy (manual steps)

From `infra/`:

```bash
npm install
npx cdk deploy
```

The first deploy creates ECR and ECS; tasks may **fail until** an image exists. Push an image tagged `latest` to the repository (outputs show `EcrRepositoryUri` and `PushImageHint`), then start a new deployment (ECS console: **Update service** → **Force new deployment**, or use `scripts/deploy-aws.sh`).

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

- **CloudFrontUrl** — public HTTPS URL (use this in the browser).
- **AlbDns** — direct HTTP to the load balancer (debugging).

## Tear down

```bash
npx cdk destroy
```

Empty the ECR repository first if `destroy` fails on repository-not-empty.

## Verification (receipts)

- `npx cdk synth` — template compiles.
- After deploy: `aws cloudformation describe-stacks --stack-name RydoStack`, `curl -s https://<cloudfront>/health`.
