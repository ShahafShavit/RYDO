#!/usr/bin/env bash
# Tear down RYDO AWS infra (CDK stack only). Uses the same config as scripts/deploy-aws.sh.
#
# Destroys the CloudFormation stack (ECR, ECS, ALB, VPC resources, CloudFront, etc.).
# Does NOT remove the CDK bootstrap stack (CDKToolkit) — usually negligible cost.
# Container SQL data is lost; redeploy starts fresh.
#
# Config: infra/deploy.env (AWS_REGION, optional AWS_PROFILE, CDK_STACK_NAME).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/infra/deploy.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy the example: cp infra/deploy.env.example infra/deploy.env"
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

: "${AWS_REGION:?Set AWS_REGION in infra/deploy.env}"
CDK_STACK_NAME="${CDK_STACK_NAME:-RydoStack}"
CDK_DESTROY_FORCE="${CDK_DESTROY_FORCE:-0}"

if [[ -n "${AWS_PROFILE:-}" ]]; then
  export AWS_PROFILE
fi

export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_REGION
export CDK_DEFAULT_REGION="$AWS_REGION"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
export CDK_DEFAULT_ACCOUNT="$ACCOUNT"

echo "Will destroy stack $CDK_STACK_NAME in account $ACCOUNT region $AWS_REGION${AWS_PROFILE:+ (profile $AWS_PROFILE)}"
echo "Set CDK_DESTROY_FORCE=1 to skip the CDK confirmation prompt (e.g. CI)."
echo ""

cd "$ROOT/infra"
npm install --no-fund --no-audit

DESTROY_ARGS=(destroy "$CDK_STACK_NAME")
if [[ "$CDK_DESTROY_FORCE" == "1" ]]; then
  DESTROY_ARGS+=(--force)
fi

npx cdk "${DESTROY_ARGS[@]}"

echo ""
echo "Done. To bring it back: scripts/deploy-aws.sh (rebuild + push + ECS rollout)."
