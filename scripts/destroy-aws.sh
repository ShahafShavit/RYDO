#!/usr/bin/env bash
# Tear down RYDO AWS infra (CDK stack only). Uses the same config as scripts/deploy-aws.sh.
#
# Destroys the CloudFormation stack (ECR, ECS, ALB, VPC resources, CloudFront, etc.).
# Does NOT remove the CDK bootstrap stack (CDKToolkit) — usually negligible cost.
# Container SQL data is lost; redeploy starts fresh.
#
# Config: optional infra/deploy.env; otherwise AWS CLI defaults.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

load_aws_deploy_env "$ROOT"

CDK_DESTROY_FORCE="${CDK_DESTROY_FORCE:-0}"

echo "This script will destroy stack $CDK_STACK_NAME in account ${CDK_DEFAULT_ACCOUNT} region $AWS_REGION${AWS_PROFILE:+ (profile $AWS_PROFILE)}"
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
