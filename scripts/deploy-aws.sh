#!/usr/bin/env bash
# Deploy RYDO to AWS: CDK (infra) → Docker build → ECR push → ECS force new deployment.
# Config: copy infra/deploy.env.example to infra/deploy.env and set AWS_REGION (and optional AWS_PROFILE).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/infra/deploy.env"
EXAMPLE="$ROOT/infra/deploy.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy the example: cp infra/deploy.env.example infra/deploy.env"
  echo "Then set AWS_REGION (and optional AWS_PROFILE)."
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

: "${AWS_REGION:?Set AWS_REGION in infra/deploy.env}"
CDK_STACK_NAME="${CDK_STACK_NAME:-RydoStack}"
IMAGE_NAME="${IMAGE_NAME:-rydo-app}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SKIP_CDK_DEPLOY="${SKIP_CDK_DEPLOY:-0}"

if [[ -n "${AWS_PROFILE:-}" ]]; then
  export AWS_PROFILE
fi

export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_REGION
export CDK_DEFAULT_REGION="$AWS_REGION"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
export CDK_DEFAULT_ACCOUNT="$ACCOUNT"

echo "Using account $ACCOUNT region $AWS_REGION${AWS_PROFILE:+ (profile $AWS_PROFILE)}"

cd "$ROOT/infra"
npm install --no-fund --no-audit

if [[ "$SKIP_CDK_DEPLOY" != "1" ]]; then
  npx cdk deploy "$CDK_STACK_NAME" --require-approval never --outputs-file cdk-outputs.json
else
  echo "SKIP_CDK_DEPLOY=1 — skipping cdk deploy (stack must already exist)"
fi

ECR_URI="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='EcrRepositoryUri'].OutputValue" --output text)"
CLUSTER_NAME="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='EcsClusterName'].OutputValue" --output text)"
SERVICE_NAME="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='EcsServiceName'].OutputValue" --output text)"
CF_URL="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text)"

REGISTRY="${ECR_URI%%/*}"

if [[ -z "$ECR_URI" || -z "$CLUSTER_NAME" || -z "$SERVICE_NAME" ]]; then
  echo "Could not read stack outputs. Deploy the stack first (cdk deploy)."
  exit 1
fi

cd "$ROOT"
echo "Building Docker image…"
docker build \
  --build-arg "VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN:-}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" -f Dockerfile .

echo "Logging in to ECR $REGISTRY …"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

FULL_IMAGE="${ECR_URI}:${IMAGE_TAG}"
echo "Tagging and pushing $FULL_IMAGE …"
docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "$FULL_IMAGE"
docker push "$FULL_IMAGE"

echo "Forcing new ECS deployment (cluster=$CLUSTER_NAME service=$SERVICE_NAME)…"
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER_NAME" \
  --service "$SERVICE_NAME" \
  --force-new-deployment \
  --no-cli-pager \
  --query 'service.serviceName' \
  --output text

echo ""
echo "Done. Public URL: $CF_URL"
echo "Health: ${CF_URL}/health"
