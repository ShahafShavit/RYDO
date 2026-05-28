#!/usr/bin/env bash
# Pull structured ride-live diagnostics from AWS CloudWatch (ECS app container).
#
# Usage:
#   scripts/pull-ride-live-logs.sh [options]
#
# Options:
#   --today           From UTC midnight today (default when no --hours/--since)
#   --hours N         Last N hours (default: 24 if neither --today nor --since)
#   --since ISO       Start time (e.g. 2026-05-28T15:00:00Z)
#   --ride ID         Filter lines mentioning ride=ID
#   --user ID         Filter lines mentioning user=ID
#   --follow          Tail new events (poll every 5s)
#   --raw             Print raw log lines (no formatting)
#   --limit N         Max events per API page (default 500)
#
# Examples:
#   scripts/pull-ride-live-logs.sh --today
#   scripts/pull-ride-live-logs.sh --hours 2 --ride 25
#   scripts/pull-ride-live-logs.sh --today --follow
#
# Requires: AWS CLI, Python 3. Config from infra/deploy.env via scripts/lib/aws-env.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

load_aws_deploy_env "$ROOT"

# Windows often has a Store "python3" stub that exits 49 without running code.
resolve_python() {
  local cmd
  for cmd in python3 python; do
    if command -v "$cmd" >/dev/null 2>&1 && "$cmd" -c "import sys" >/dev/null 2>&1; then
      echo "$cmd"
      return 0
    fi
  done
  if command -v py >/dev/null 2>&1 && py -3 -c "import sys" >/dev/null 2>&1; then
    echo "py -3"
    return 0
  fi
  echo "Python 3 required (python3, python, or py -3)." >&2
  return 1
}

PYTHON="$(resolve_python)"
run_python() {
  # shellcheck disable=SC2086
  $PYTHON "$@"
}

TODAY=0
HOURS=""
SINCE=""
RIDE=""
USER=""
FOLLOW=0
RAW=0
LIMIT=500

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \?//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --today) TODAY=1; shift ;;
    --hours) HOURS="${2:-}"; shift 2 ;;
    --since) SINCE="${2:-}"; shift 2 ;;
    --ride) RIDE="${2:-}"; shift 2 ;;
    --user) USER="${2:-}"; shift 2 ;;
    --follow) FOLLOW=1; shift ;;
    --raw) RAW=1; shift ;;
    --limit) LIMIT="${2:-}"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

resolve_log_group() {
  aws cloudformation describe-stack-resources \
    --stack-name "$CDK_STACK_NAME" \
    --query "StackResources[?ResourceType=='AWS::Logs::LogGroup'].PhysicalResourceId" \
    --output text 2>/dev/null | head -1
}

LOG_GROUP="$(resolve_log_group)"
if [[ -z "$LOG_GROUP" || "$LOG_GROUP" == "None" ]]; then
  echo "Could not resolve CloudWatch log group from stack $CDK_STACK_NAME" >&2
  exit 1
fi

compute_start_ms() {
  run_python - <<'PY'
import os, sys, time
from datetime import datetime, timezone, timedelta

today = os.environ.get("PULL_TODAY") == "1"
hours = os.environ.get("PULL_HOURS", "").strip()
since = os.environ.get("PULL_SINCE", "").strip()
now = datetime.now(timezone.utc)

if since:
    try:
        if since.endswith("Z"):
            dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        else:
            dt = datetime.fromisoformat(since)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
    except ValueError as e:
        print(f"Invalid --since: {e}", file=sys.stderr)
        sys.exit(1)
elif today:
    dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
elif hours:
    dt = now - timedelta(hours=float(hours))
else:
    dt = now - timedelta(hours=24)

print(int(dt.timestamp() * 1000))
PY
}

export PULL_TODAY="$TODAY"
export PULL_HOURS="$HOURS"
export PULL_SINCE="$SINCE"
START_MS="$(compute_start_ms)"
END_MS="$(run_python -c "import time; print(int(time.time()*1000))")"

# Match structured [RideLive] tag and legacy ride-live messages pre-deploy.
FILTER='?"[RideLive]" ?"Ride live hub" ?"Ride live pose store"'

echo "Log group: $LOG_GROUP (region $AWS_REGION)" >&2
echo "Window: startMs=$START_MS endMs=$END_MS follow=$FOLLOW ride=${RIDE:-*} user=${USER:-*}" >&2

format_events() {
  local input="$1"
  local tmp
  tmp="$(mktemp "${TMPDIR:-/tmp}/rydo-ride-live-logs.XXXXXX")"
  printf '%s' "$input" >"$tmp"
  run_python - "$RAW" "$RIDE" "$USER" "$tmp" <<'PY'
import json, sys, re
from datetime import datetime, timezone

raw = sys.argv[1] == "1"
ride_filter = sys.argv[2].strip()
user_filter = sys.argv[3].strip()

with open(sys.argv[4], encoding="utf-8") as f:
    data = json.load(f)
events = data.get("events", [])

# Structured field extractors
re_state = re.compile(
    r"state machine=(?P<machine>\w+) ride=(?P<ride>\d+) user=(?P<user>\d+) "
    r"(?P<from>[^->]+)->(?P<to>\S+) reason=(?P<reason>\S+)"
)
re_timer = re.compile(
    r"timer (?P<action>\w+) kind=(?P<kind>\w+) ride=(?P<ride>\d+) user=(?P<user>\d+) reason=(?P<reason>\S+)"
)
re_transport = re.compile(
    r"transport (?P<phase>\w+) connection=(?P<conn>\S+) user=(?P<user>\S+) ride=(?P<ride>\S+) reason=(?P<reason>\S+)"
)

def line_matches_filters(text: str) -> bool:
    if ride_filter and f"ride={ride_filter}" not in text and f"ride {ride_filter}" not in text:
        return False
    if user_filter and f"user={user_filter}" not in text and f"user {user_filter}" not in text:
        return False
    return True

def summarize(msg: str) -> str:
    m = re_state.search(msg)
    if m:
        d = m.groupdict()
        return f"STATE {d['machine']:9} ride={d['ride']} user={d['user']:>3}  {d['from']} -> {d['to']}  ({d['reason']})"
    m = re_timer.search(msg)
    if m:
        d = m.groupdict()
        return f"TIMER {d['action']:18} {d['kind']:8} ride={d['ride']} user={d['user']:>3}  ({d['reason']})"
    m = re_transport.search(msg)
    if m:
        d = m.groupdict()
        return f"TRANSPORT {d['phase']:12} ride={d['ride']:>4} user={d['user']:>4} conn={d['conn'][:16]}  ({d['reason']})"
    if "broadcast" in msg:
        return "BROADCAST " + msg.split("[RideLive]", 1)[-1].strip()[:120]
    if "hub JoinRide" in msg or "hub JoinRide" in msg:
        return "HUB       " + msg.strip()[-140:]
    if "skipped" in msg:
        return "SKIPPED   " + msg.split("[RideLive]", 1)[-1].strip()[:120]
    if "[RideLive]" in msg:
        return "RIDELIVE  " + msg.split("[RideLive]", 1)[-1].strip()[:120]
    if "Ride live hub" in msg:
        return "LEGACY    " + msg.strip()[-140:]
    return "OTHER     " + msg.strip()[-140:]

shown = 0
for e in events:
    msg = e.get("message", "")
    if not line_matches_filters(msg):
        continue
    ts = datetime.fromtimestamp(e["timestamp"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    body = msg.strip().replace("\n", " ")
    if raw:
        print(f"{ts} UTC | {body}")
    else:
        print(f"{ts} UTC | {summarize(body)}")
    shown += 1

if data.get("nextToken") and shown == 0:
    pass
print(f"# events_shown={shown} fetched={len(events)}", file=sys.stderr)
PY
  rm -f "$tmp"
}

fetch_page() {
  local start_ms="$1"
  local token="${2:-}"
  local args=(
    logs filter-log-events
    --log-group-name "$LOG_GROUP"
    --log-stream-name-prefix "app"
    --filter-pattern "$FILTER"
    --start-time "$start_ms"
    --end-time "$END_MS"
    --limit "$LIMIT"
    --output json
  )
  if [[ -n "$token" ]]; then
    args+=(--next-token "$token")
  fi
  aws "${args[@]}"
}

pull_once() {
  local token=""
  local start_ms="$START_MS"
  while true; do
    json="$(fetch_page "$start_ms" "$token")"
    format_events "$json"
    token="$(printf '%s' "$json" | run_python -c "import json,sys; d=json.load(sys.stdin); print(d.get('nextToken') or '')")"
    [[ -z "$token" ]] && break
  done
}

if [[ "$FOLLOW" -eq 0 ]]; then
  pull_once
  exit 0
fi

LAST_MS="$START_MS"
while true; do
  json="$(aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --log-stream-name-prefix "app" \
    --filter-pattern "$FILTER" \
    --start-time "$LAST_MS" \
    --end-time "$(run_python -c "import time; print(int(time.time()*1000))")" \
    --limit "$LIMIT" \
    --output json)"
  format_events "$json"
  LAST_MS="$(printf '%s' "$json" | run_python -c "
import json, sys
d = json.load(sys.stdin)
ev = d.get('events', [])
if ev:
    print(ev[-1]['timestamp'] + 1)
else:
    import time
    print(int(time.time()*1000) - 5000)
")"
  sleep 5
done
