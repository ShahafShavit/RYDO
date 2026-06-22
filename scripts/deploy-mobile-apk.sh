#!/usr/bin/env bash
# Build Capacitor Android APK (debug by default) and upload to S3 for https://rydo.bike/app/rydo.apk.
# Download UX lives on the marketing site at /#get-app (not S3).
# Prerequisites: AWS CLI, Node/npm, JDK 21, ANDROID_HOME (same as mobile/README.md).
# Infra: run scripts/deploy-aws.sh once after CDK adds MobileAppBucket + CloudFront /app/*.apk behavior.
#
# Optional in infra/deploy.env:
#   MOBILE_APK_BUILD=debug|release   (default: debug — release needs Gradle signing config)
#   MOBILE_APK_FILENAME=rydo.apk       (default: rydo.apk)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE="$ROOT/mobile"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

load_aws_deploy_env "$ROOT"

MOBILE_APK_BUILD="${MOBILE_APK_BUILD:-debug}"
MOBILE_APK_FILENAME="${MOBILE_APK_FILENAME:-rydo.apk}"

read_stack_output() {
  aws cloudformation describe-stacks --stack-name "$CDK_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text \
    | tr -d '\r'
}

BUCKET="$(read_stack_output MobileAppBucketName)"
CF_DIST_ID="$(read_stack_output CloudFrontDistributionId)"
CF_URL="$(read_stack_output CloudFrontUrl)"
LANDING_URL="$(read_stack_output MobileAppLandingUrl)"
DOWNLOAD_URL="$(read_stack_output MobileAppDownloadUrl)"

MOBILE_APK_BUILD="${MOBILE_APK_BUILD//$'\r'/}"
MOBILE_APK_FILENAME="${MOBILE_APK_FILENAME//$'\r'/}"

if [[ -z "$BUCKET" || "$BUCKET" == "None" ]]; then
  echo "MobileAppBucketName not found in stack $CDK_STACK_NAME."
  echo "Deploy infra first: bash scripts/deploy-aws.sh"
  exit 1
fi

if [[ -z "$CF_DIST_ID" || "$CF_DIST_ID" == "None" ]]; then
  echo "CloudFrontDistributionId not found in stack $CDK_STACK_NAME."
  exit 1
fi

echo "Using bucket s3://$BUCKET (stack $CDK_STACK_NAME, region $AWS_REGION)"

cd "$MOBILE"

if [[ ! -d node_modules ]]; then
  echo "Installing mobile dependencies…"
  npm ci --no-fund --no-audit
fi

echo "Writing production mobile/.env.local…"
npm run env:prod

echo "Building Vite bundle…"
npm run build

echo "Syncing Capacitor Android project…"
npx cap sync android

if [[ "$MOBILE_APK_BUILD" == "release" ]]; then
  echo "Building release APK (assembleRelease)…"
  ANDROID_DIR="$MOBILE/android"
  GRADLEW="./gradlew"
  [[ "$(uname -s 2>/dev/null || echo)" == MINGW* || "$(uname -s 2>/dev/null || echo)" == MSYS* ]] && GRADLEW="gradlew.bat"
  (cd "$ANDROID_DIR" && "$GRADLEW" assembleRelease)
  APK_PATH="$MOBILE/android/app/build/outputs/apk/release/app-release-unsigned.apk"
  if [[ ! -f "$APK_PATH" ]]; then
    APK_PATH="$MOBILE/android/app/build/outputs/apk/release/app-release.apk"
  fi
else
  echo "Building debug APK (assembleDebug)…"
  node scripts/assemble-android-debug.mjs --quiet
  APK_PATH="$MOBILE/android/app/build/outputs/apk/debug/app-debug.apk"
fi

if [[ ! -f "$APK_PATH" ]]; then
  echo "APK not found at $APK_PATH"
  exit 1
fi

APK_SIZE_MB="$(awk "BEGIN {printf \"%.1f\", $(stat -c%s "$APK_PATH" 2>/dev/null || stat -f%z "$APK_PATH") / 1048576}")"
echo "APK ready: $APK_PATH (${APK_SIZE_MB} MB, build=$MOBILE_APK_BUILD)"

echo "Uploading to s3://$BUCKET/app/$MOBILE_APK_FILENAME …"
aws s3 cp "$APK_PATH" "s3://$BUCKET/app/$MOBILE_APK_FILENAME" \
  --content-type application/vnd.android.package-archive \
  --content-disposition "attachment; filename=\"${MOBILE_APK_FILENAME}\""

INVALIDATION_PATH="/app/${MOBILE_APK_FILENAME}"

echo "Invalidating CloudFront ${INVALIDATION_PATH} …"
if [[ "$(uname -s 2>/dev/null || echo)" == MINGW* || "$(uname -s 2>/dev/null || echo)" == MSYS* ]]; then
  INVALIDATION_BATCH="$ROOT/.cf-invalidation-batch.json"
  cat >"$INVALIDATION_BATCH" <<EOF
{
  "Paths": {
    "Quantity": 1,
    "Items": ["${INVALIDATION_PATH}"]
  },
  "CallerReference": "rydo-mobile-apk-$(date +%s)-$$"
}
EOF
  if command -v cygpath >/dev/null 2>&1; then
    INVALIDATION_FILE="file://$(cygpath -m "$INVALIDATION_BATCH")"
  else
    INVALIDATION_FILE="file:///${INVALIDATION_BATCH//\\//}"
  fi
  INVALIDATION_ID="$(aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --invalidation-batch "$INVALIDATION_FILE" \
    --query 'Invalidation.Id' \
    --output text | tr -d '\r')"
  rm -f "$INVALIDATION_BATCH"
else
  INVALIDATION_ID="$(aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "$INVALIDATION_PATH" \
    --query 'Invalidation.Id' \
    --output text | tr -d '\r')"
fi

echo ""
echo "Mobile APK deploy complete."
echo "  Landing:  ${LANDING_URL:-${CF_URL}/#get-app}"
echo "  Download: ${DOWNLOAD_URL:-${CF_URL}/app/${MOBILE_APK_FILENAME}}"
echo "  Invalidation: $INVALIDATION_ID"
if [[ "$MOBILE_APK_BUILD" == "debug" ]]; then
  echo ""
  echo "Note: debug APK — for wider distribution configure release signing and MOBILE_APK_BUILD=release."
fi
