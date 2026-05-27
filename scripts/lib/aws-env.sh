# Shared AWS deploy config for scripts/deploy-aws.sh, ecs-scale.sh, destroy-aws.sh.
# deploy.env is optional; region/profile fall back to the AWS CLI default configuration.

load_aws_deploy_env() {
  local root="$1"
  local env_file="$root/infra/deploy.env"
  local client_env="$root/client/.env.local"

  if [[ -f "$env_file" ]]; then
    # shellcheck source=/dev/null
    set -a
    source "$env_file"
    set +a
  fi

  if [[ -z "${AWS_REGION:-}" ]]; then
    AWS_REGION="$(aws configure get region 2>/dev/null || true)"
  fi
  AWS_REGION="${AWS_REGION:-us-east-1}"

  if [[ -z "${AWS_PROFILE:-}" ]]; then
    AWS_PROFILE="$(aws configure get profile 2>/dev/null || true)"
  fi
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    export AWS_PROFILE
  fi

  export AWS_DEFAULT_REGION="$AWS_REGION"
  export AWS_REGION

  CDK_STACK_NAME="${CDK_STACK_NAME:-RydoStack}"
  IMAGE_NAME="${IMAGE_NAME:-rydo-app}"
  IMAGE_TAG="${IMAGE_TAG:-latest}"
  DESIRED_COUNT_ON="${DESIRED_COUNT_ON:-1}"

  if [[ -z "${VITE_MAPBOX_ACCESS_TOKEN:-}" && -f "$client_env" ]]; then
    # shellcheck source=/dev/null
    set -a
    source "$client_env"
    set +a
  fi

  export CDK_DEFAULT_REGION="$AWS_REGION"
  export CDK_DEFAULT_ACCOUNT="${CDK_DEFAULT_ACCOUNT:-$(aws sts get-caller-identity --query Account --output text)}"
}
