#!/usr/bin/env bash
# Scale RYDO ECS Fargate service up or down (same config as scripts/deploy-aws.sh).
#
# Usage:
#   scripts/ecs-scale.sh status|on|off
#
# - off  → desiredCount 0 (no running tasks; Fargate compute stops billing)
# - on   → desiredCount DESIRED_COUNT_ON (default 1)
# - status → print desired/running/pending counts and deployment state
#
# Notes:
# - ALB, CloudFront, ECR storage, and idle log groups still incur cost while the stack exists.
# - Running deploy-aws.sh scales tasks back up after push.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

usage() {
  echo "Usage: $(basename "$0") status|on|off"
  echo ""
  echo "  status   Show ECS service desired/running counts and last events"
  echo "  on       Set desired count to DESIRED_COUNT_ON (default 1) and wait until stable"
  echo "  off      Set desired count to 0 and wait until no tasks remain"
  exit "${1:-0}"
}

load_aws_deploy_env "$ROOT"

ACTION="${1:-}"
[[ -n "$ACTION" ]] || usage 1

if [[ "$ACTION" != "status" && "$ACTION" != "on" && "$ACTION" != "off" ]]; then
  usage 1
fi

CLUSTER_NAME="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='EcsClusterName'].OutputValue" --output text)"
SERVICE_NAME="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='EcsServiceName'].OutputValue" --output text)"
CF_URL="$(aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text 2>/dev/null || true)"

if [[ -z "$CLUSTER_NAME" || -z "$SERVICE_NAME" || "$CLUSTER_NAME" == "None" || "$SERVICE_NAME" == "None" ]]; then
  echo "Could not read EcsClusterName / EcsServiceName from stack $CDK_STACK_NAME."
  exit 1
fi

print_status() {
  local desired running pending status roll
  read -r desired running pending status <<<"$(aws ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --no-cli-pager \
    --query 'services[0].[desiredCount,runningCount,pendingCount,status]' \
    --output text)"
  roll="$(aws ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --no-cli-pager \
    --query 'length(services[0].deployments)' \
    --output text)"
  echo "Cluster:   $CLUSTER_NAME"
  echo "Service:   $SERVICE_NAME"
  echo "Status:    $status"
  echo "Desired:   $desired"
  echo "Running:   $running"
  echo "Pending:   $pending"
  echo "Deployments (count): $roll"
  if [[ -n "${CF_URL:-}" && "$CF_URL" != "None" ]]; then
    echo "CloudFront: $CF_URL"
  fi
  echo ""
  echo "Recent service events:"
  aws ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --no-cli-pager \
    --query 'services[0].events[:5].[createdAt,message]' \
    --output text | sed 's/^/  /' || true
}

verify_counts() {
  local want_desired="$1"
  local desired running
  read -r desired running <<<"$(aws ecs describe-services \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --no-cli-pager \
    --query 'services[0].[desiredCount,runningCount]' \
    --output text)"
  if [[ "$desired" != "$want_desired" ]]; then
    echo "Verification failed: desiredCount is $desired (expected $want_desired)."
    return 1
  fi
  if [[ "$running" != "$want_desired" ]]; then
    echo "Verification failed: runningCount is $running (expected $want_desired to match desired)."
    return 1
  fi
  echo "Verified: desired=$desired running=$running"
  return 0
}

case "$ACTION" in
  status)
    print_status
    ;;
  off)
    echo "Scaling ECS service to 0 (cluster=$CLUSTER_NAME service=$SERVICE_NAME)…"
    aws ecs update-service \
      --region "$AWS_REGION" \
      --cluster "$CLUSTER_NAME" \
      --service "$SERVICE_NAME" \
      --desired-count 0 \
      --no-cli-pager \
      --query 'service.{desired:desiredCount,running:runningCount}' \
      --output text
    echo "Waiting for service to stabilize (no running tasks)…"
    aws ecs wait services-stable \
      --region "$AWS_REGION" \
      --cluster "$CLUSTER_NAME" \
      --services "$SERVICE_NAME"
    verify_counts 0
    echo ""
    echo "ECS compute is off. ALB/CloudFront/ECR may still incur charges."
    ;;
  on)
    if ! [[ "$DESIRED_COUNT_ON" =~ ^[0-9]+$ ]] || [[ "$DESIRED_COUNT_ON" -lt 1 ]]; then
      echo "DESIRED_COUNT_ON must be a positive integer (got: ${DESIRED_COUNT_ON:-empty})"
      exit 1
    fi
    echo "Scaling ECS service to $DESIRED_COUNT_ON (cluster=$CLUSTER_NAME service=$SERVICE_NAME)…"
    aws ecs update-service \
      --region "$AWS_REGION" \
      --cluster "$CLUSTER_NAME" \
      --service "$SERVICE_NAME" \
      --desired-count "$DESIRED_COUNT_ON" \
      --no-cli-pager \
      --query 'service.{desired:desiredCount,running:runningCount}' \
      --output text
    echo "Waiting for service to stabilize…"
    aws ecs wait services-stable \
      --region "$AWS_REGION" \
      --cluster "$CLUSTER_NAME" \
      --services "$SERVICE_NAME"
    verify_counts "$DESIRED_COUNT_ON"
    if [[ -n "${CF_URL:-}" && "$CF_URL" != "None" ]]; then
      echo "Health check: ${CF_URL}/health"
    fi
    ;;
esac
