#!/usr/bin/env bash
# One-command AWS deploy: CDK (infra) -> Docker build -> ECR push -> ECS rollout -> health check.
# Prerequisites: AWS CLI credentials, Docker, Node/npm (for CDK).
# Optional overrides: infra/deploy.env (region, profile, Mapbox token, etc.).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

load_aws_deploy_env "$ROOT"

if ! [[ "$DESIRED_COUNT_ON" =~ ^[0-9]+$ ]] || [[ "$DESIRED_COUNT_ON" -lt 1 ]]; then
  echo "DESIRED_COUNT_ON must be a positive integer (got: ${DESIRED_COUNT_ON:-empty})"
  exit 1
fi

echo "Using account ${CDK_DEFAULT_ACCOUNT} region ${AWS_REGION}${AWS_PROFILE:+ (profile $AWS_PROFILE)}"

cd "$ROOT/infra"
npm install --no-fund --no-audit

echo "Ensuring CDK bootstrap…"
npx cdk bootstrap "aws://${CDK_DEFAULT_ACCOUNT}/${AWS_REGION}" --require-approval never

run_cdk_deploy() {
  npx cdk deploy "$CDK_STACK_NAME" --require-approval never --outputs-file cdk-outputs.json
}

if aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" --no-cli-pager >/dev/null 2>&1; then
  if diff_out="$(npx cdk diff "$CDK_STACK_NAME" 2>&1)" && [[ "$diff_out" == *"Number of stacks with differences: 0"* ]]; then
    echo "Infra unchanged; skipping cdk deploy."
  else
    echo "Infra changes detected; running cdk deploy…"
    run_cdk_deploy
  fi
else
  echo "Stack not found; running initial cdk deploy…"
  run_cdk_deploy
fi

read_stack_output() {
  aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

ECR_URI="$(read_stack_output EcrRepositoryUri)"
CLUSTER_NAME="$(read_stack_output EcsClusterName)"
SERVICE_NAME="$(read_stack_output EcsServiceName)"
CF_URL="$(read_stack_output CloudFrontUrl)"

REGISTRY="${ECR_URI%%/*}"

if [[ -z "$ECR_URI" || -z "$CLUSTER_NAME" || -z "$SERVICE_NAME" || -z "$CF_URL" ]]; then
  echo "Could not read stack outputs from $CDK_STACK_NAME."
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

echo "Starting ECS tasks (desired=$DESIRED_COUNT_ON, cluster=$CLUSTER_NAME service=$SERVICE_NAME)…"
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER_NAME" \
  --service "$SERVICE_NAME" \
  --desired-count "$DESIRED_COUNT_ON" \
  --force-new-deployment \
  --no-cli-pager \
  --query 'service.serviceName' \
  --output text >/dev/null

echo "Waiting for ECS service to stabilize (SQL + app health checks can take several minutes)…"
aws ecs wait services-stable \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME"

HEALTH_URL="${CF_URL}/health"
echo "Verifying $HEALTH_URL …"
for attempt in 1 2 3 4 5 6; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo ""
    echo "Deploy complete."
    echo "Public URL: $CF_URL"
    echo "Health:     $HEALTH_URL"
    if [[ -n "${DOMAIN_NAME:-}" ]]; then
      echo "Domain:     https://${DOMAIN_NAME}"
    fi
    exit 0
  fi
  echo "  attempt $attempt/6 failed; retrying in 15s…"
  sleep 15
done

echo "ECS is stable but $HEALTH_URL did not return 200. Check CloudWatch logs and target group health."
exit 1
