#!/usr/bin/env bash
# Print up-to-date RYDO AWS costs from Cost Explorer (gross usage, credits, domain, net).
#
# Shows list-price usage for stack services (ECS, ALB, VPC, ECR, S3, CloudWatch,
# CloudFront, ACM, Route 53, data transfer), AWS credits / free-tier offsets,
# domain registration + tax, and CloudFormation stack lifetimes.
#
# Config: optional infra/deploy.env; otherwise AWS CLI defaults.
# Optional env:
#   COST_START=YYYY-MM-DD   (default: 2026-04-01 — first known RydoStack deploy)
#   COST_END=YYYY-MM-DD     (default: tomorrow UTC; Cost Explorer end is exclusive)
#   RYDO_DOMAIN=rydo.bike   (domain name for registrar attribution notes)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/aws-env.sh
source "$SCRIPT_DIR/lib/aws-env.sh"

load_aws_deploy_env "$ROOT"

COST_START="${COST_START:-2026-04-01}"
COST_END="${COST_END:-$(node -e "const d=new Date(); d.setUTCDate(d.getUTCDate()+1); console.log(d.toISOString().slice(0,10))")}"
RYDO_DOMAIN="${RYDO_DOMAIN:-rydo.bike}"
STACK_NAME="${CDK_STACK_NAME:-RydoStack}"

STACK_SERVICES=(
  "Amazon Elastic Container Service"
  "Amazon Elastic Load Balancing"
  "Amazon EC2 Container Registry (ECR)"
  "Amazon Virtual Private Cloud"
  "AmazonCloudWatch"
  "Amazon Simple Storage Service"
  "AWS Certificate Manager"
  "Amazon CloudFront"
  "Amazon Route 53"
  "AWS Data Transfer"
)

json_array() {
  node -e '
    const items = process.argv.slice(1);
    process.stdout.write(JSON.stringify(items));
  ' "$@"
}

ce_get() {
  local filter_json="$1"
  local group_by="${2:-}"
  local granularity="${3:-MONTHLY}"
  local args=(
    ce get-cost-and-usage
    --time-period "Start=${COST_START},End=${COST_END}"
    --granularity "$granularity"
    --metrics UnblendedCost
    --filter "$filter_json"
    --output json
  )
  if [[ -n "$group_by" ]]; then
    args+=(--group-by "$group_by")
  fi
  aws "${args[@]}"
}

echo "RYDO AWS costs"
echo "=============="
echo "Account:  ${CDK_DEFAULT_ACCOUNT}"
echo "Profile:  ${AWS_PROFILE:-default}"
echo "Period:   ${COST_START} → ${COST_END} (end exclusive)"
echo "Stack:    ${STACK_NAME}"
echo "Domain:   ${RYDO_DOMAIN}"
echo ""

# --- Stack lifetimes (CloudFormation retains DELETE_COMPLETE history) ---
echo "Stack lifetimes"
echo "---------------"
STACK_REGIONS=(eu-central-1 us-east-1)
FOUND_STACK=0
for region in "${STACK_REGIONS[@]}"; do
  rows="$(aws cloudformation list-stacks \
    --region "$region" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE DELETE_COMPLETE ROLLBACK_COMPLETE \
    --query "StackSummaries[?StackName=='${STACK_NAME}'].[CreationTime,DeletionTime,StackStatus]" \
    --output text 2>/dev/null || true)"
  if [[ -z "${rows//[[:space:]]/}" ]]; then
    continue
  fi
  FOUND_STACK=1
  while IFS=$'\t' read -r created deleted status; do
    created="${created//$'\r'/}"
    deleted="${deleted//$'\r'/}"
    status="${status//$'\r'/}"
    [[ -z "$created" ]] && continue
    deleted_disp="${deleted:-None}"
    echo "  ${region}  ${created}  →  ${deleted_disp}  (${status})"
  done <<< "$rows"
done
if [[ "$FOUND_STACK" -eq 0 ]]; then
  echo "  (no ${STACK_NAME} history in ${STACK_REGIONS[*]})"
fi
echo ""

SERVICES_JSON="$(json_array "${STACK_SERVICES[@]}")"

FILTER_USAGE="$(node -e '
  const services = JSON.parse(process.argv[1]);
  process.stdout.write(JSON.stringify({
    And: [
      { Dimensions: { Key: "RECORD_TYPE", Values: ["Usage"] } },
      { Dimensions: { Key: "SERVICE", Values: services } }
    ]
  }));
' "$SERVICES_JSON")"

FILTER_RECORD="$(node -e '
  const services = JSON.parse(process.argv[1]);
  process.stdout.write(JSON.stringify({
    Or: [
      { Dimensions: { Key: "SERVICE", Values: services } },
      { Dimensions: { Key: "SERVICE", Values: ["Amazon Registrar", "Tax"] } }
    ]
  }));
' "$SERVICES_JSON")"

FILTER_REGISTRAR='{"Dimensions":{"Key":"SERVICE","Values":["Amazon Registrar"]}}'
FILTER_TAX='{"Dimensions":{"Key":"SERVICE","Values":["Tax"]}}'

echo "Querying Cost Explorer…"
TMPDIR_COSTS="$(mktemp -d "${TMPDIR:-/tmp}/rydo-costs.XXXXXX")"
cleanup_costs_tmp() { rm -rf "$TMPDIR_COSTS"; }
trap cleanup_costs_tmp EXIT

ce_get "$FILTER_USAGE" "Type=DIMENSION,Key=SERVICE" >"$TMPDIR_COSTS/usage-by-service.json"
ce_get "$FILTER_RECORD" "Type=DIMENSION,Key=RECORD_TYPE" >"$TMPDIR_COSTS/record-type.json"
ce_get "$FILTER_REGISTRAR" >"$TMPDIR_COSTS/registrar.json"
ce_get "$FILTER_TAX" >"$TMPDIR_COSTS/tax.json"
ce_get "$FILTER_USAGE" >"$TMPDIR_COSTS/monthly-usage.json"
ce_get "$FILTER_RECORD" "Type=DIMENSION,Key=RECORD_TYPE" DAILY >"$TMPDIR_COSTS/daily-record.json"
ce_get "$FILTER_USAGE" "Type=DIMENSION,Key=SERVICE" DAILY >"$TMPDIR_COSTS/daily-usage-by-service.json"

node -e '
const fs = require("fs");
const dir = process.argv[1];
const domain = process.argv[2];
const read = (name) => JSON.parse(fs.readFileSync(dir + "/" + name, "utf8"));

const usageByService = read("usage-by-service.json");
const recordTypes = read("record-type.json");
const registrar = read("registrar.json");
const tax = read("tax.json");
const monthlyUsage = read("monthly-usage.json");
const dailyRecord = read("daily-record.json");
const dailyUsageByService = read("daily-usage-by-service.json");

const money = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs > 0 && abs < 0.005) return v.toFixed(6);
  return v.toFixed(2);
};

const moneyCell = (n, width = 10) => {
  const v = Number(n) || 0;
  // Collapse float dust after credit offsets to a clean zero.
  const shown = Math.abs(v) < 0.005 ? 0 : v;
  return ("$" + money(shown)).padStart(width);
};

const sumMetric = (results, key = "UnblendedCost") =>
  (results.ResultsByTime || []).reduce((acc, r) => {
    const amount = r.Total?.[key]?.Amount;
    if (amount != null) return acc + Number(amount);
    for (const g of r.Groups || []) {
      acc += Number(g.Metrics?.[key]?.Amount || 0);
    }
    return acc;
  }, 0);

const byService = new Map();
for (const period of usageByService.ResultsByTime || []) {
  for (const g of period.Groups || []) {
    const name = g.Keys[0];
    const amount = Number(g.Metrics.UnblendedCost.Amount || 0);
    byService.set(name, (byService.get(name) || 0) + amount);
  }
}

const byRecord = new Map();
for (const period of recordTypes.ResultsByTime || []) {
  for (const g of period.Groups || []) {
    const name = g.Keys[0];
    const amount = Number(g.Metrics.UnblendedCost.Amount || 0);
    byRecord.set(name, (byRecord.get(name) || 0) + amount);
  }
}

const usage = byRecord.get("Usage") || sumMetric(monthlyUsage);
const credit = byRecord.get("Credit") || 0;
const bundled = byRecord.get("Bundled Discount") || 0;
const other = byRecord.get("Other") || 0; // Registrar often lands here
const taxFromRecord = byRecord.get("Tax") || 0;

const registrarTotal = sumMetric(registrar);
const taxTotal = sumMetric(tax) || taxFromRecord;
const domainTotal = registrarTotal || other;

const infraGross = usage;
const offsets = credit + bundled;
const grandGross = infraGross + domainTotal + taxTotal;
const outOfPocket = grandGross + offsets; // offsets are negative

console.log("Gross usage by service (list price, before credits)");
console.log("----------------------------------------------------");
const sorted = [...byService.entries()].sort((a, b) => b[1] - a[1]);
let printed = 0;
for (const [name, amount] of sorted) {
  if (Math.abs(amount) < 1e-9) continue;
  console.log(`  ${name.padEnd(42)} $${money(amount)}`);
  printed++;
}
if (!printed) console.log("  (no usage in this period)");
console.log(`  ${"Infra / DNS subtotal".padEnd(42)} $${money(infraGross)}`);
console.log("");

console.log("Domain & tax");
console.log("------------");
console.log(`  Amazon Registrar (${domain})`.padEnd(44) + `$${money(domainTotal)}`);
console.log(`  Tax`.padEnd(44) + `$${money(taxTotal)}`);
console.log(`  Domain subtotal`.padEnd(44) + `$${money(domainTotal + taxTotal)}`);
console.log("");

console.log("Credits & discounts");
console.log("-------------------");
console.log(`  AWS credits / free tier`.padEnd(44) + `$${money(credit)}`);
console.log(`  Bundled discounts`.padEnd(44) + `$${money(bundled)}`);
console.log(`  Offsets subtotal`.padEnd(44) + `$${money(offsets)}`);
console.log("");

console.log("Totals");
console.log("------");
console.log(`  Gross resource value (everything)`.padEnd(44) + `$${money(grandGross)}`);
console.log(`  Covered by credits / discounts`.padEnd(44) + `$${money(Math.abs(offsets))}`);
console.log(`  Paid out of pocket`.padEnd(44) + `$${money(outOfPocket)}`);
console.log("");

console.log("Monthly gross infra/DNS usage");
console.log("-----------------------------");
for (const period of monthlyUsage.ResultsByTime || []) {
  const start = period.TimePeriod.Start;
  const amount = Number(period.Total?.UnblendedCost?.Amount || 0);
  const flag = period.Estimated ? " (estimated)" : "";
  console.log(`  ${start}`.padEnd(14) + `$${money(amount)}${flag}`);
}

const emptyDay = (date, estimated) => ({
  date,
  usage: 0,
  credit: 0,
  bundled: 0,
  domain: 0,
  tax: 0,
  estimated: !!estimated,
  ecs: 0,
  alb: 0,
  vpc: 0,
  otherInfra: 0,
});

const dailyByDate = new Map();
for (const period of dailyRecord.ResultsByTime || []) {
  const date = period.TimePeriod.Start;
  const row = dailyByDate.get(date) || emptyDay(date, period.Estimated);
  row.estimated = row.estimated || !!period.Estimated;
  for (const g of period.Groups || []) {
    const name = g.Keys[0];
    const amount = Number(g.Metrics.UnblendedCost.Amount || 0);
    if (name === "Usage") row.usage += amount;
    else if (name === "Credit") row.credit += amount;
    else if (name === "Bundled Discount") row.bundled += amount;
    else if (name === "Other") row.domain += amount;
    else if (name === "Tax") row.tax += amount;
  }
  dailyByDate.set(date, row);
}

for (const period of dailyUsageByService.ResultsByTime || []) {
  const date = period.TimePeriod.Start;
  const row = dailyByDate.get(date) || emptyDay(date, period.Estimated);
  row.estimated = row.estimated || !!period.Estimated;
  for (const g of period.Groups || []) {
    const name = g.Keys[0];
    const amount = Number(g.Metrics.UnblendedCost.Amount || 0);
    if (name === "Amazon Elastic Container Service") row.ecs += amount;
    else if (name === "Amazon Elastic Load Balancing") row.alb += amount;
    else if (name === "Amazon Virtual Private Cloud") row.vpc += amount;
    else row.otherInfra += amount;
  }
  const serviceSum = row.ecs + row.alb + row.vpc + row.otherInfra;
  if (Math.abs(serviceSum) > 1e-12) row.usage = serviceSum;
  dailyByDate.set(date, row);
}

const days = [...dailyByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
// Keep days with real stack burn or domain/tax; drop Route 53 / residual pennies.
const activeDays = days.filter((d) => {
  const stackBurn = d.ecs + d.alb + d.vpc;
  return stackBurn >= 0.05 || Math.abs(d.domain) + Math.abs(d.tax) >= 0.01;
});

console.log("");
console.log("Costs over time (daily, list-price usage)");
console.log("-----------------------------------------");
const hdr =
  "Date".padEnd(12) +
  " ECS".padStart(9) +
  " ALB".padStart(9) +
  " VPC".padStart(9) +
  " Other".padStart(9) +
  " Infra".padStart(9) +
  " Domain".padStart(9) +
  " Tax".padStart(9) +
  " Credits".padStart(10) +
  " Gross".padStart(9) +
  " Net".padStart(9);
console.log("  " + hdr);
console.log(
  "  " +
    "-".repeat(12) +
    " -------- -------- -------- -------- -------- -------- -------- --------- -------- --------"
);

const skippedQuiet = days.length - activeDays.length;
for (const d of activeDays) {
  const offsetsDay = d.credit + d.bundled;
  const gross = d.usage + d.domain + d.tax;
  const net = gross + offsetsDay;
  const flag = d.estimated ? " *" : "";
  console.log(
    "  " +
      d.date.padEnd(12) +
      moneyCell(d.ecs, 9) +
      moneyCell(d.alb, 9) +
      moneyCell(d.vpc, 9) +
      moneyCell(d.otherInfra, 9) +
      moneyCell(d.usage, 9) +
      moneyCell(d.domain, 9) +
      moneyCell(d.tax, 9) +
      moneyCell(offsetsDay, 10) +
      moneyCell(gross, 9) +
      moneyCell(net, 9) +
      flag
  );
}
if (!activeDays.length) console.log("  (no daily costs in this period)");
if (skippedQuiet > 0) {
  console.log(`  (${skippedQuiet} quiet day(s) omitted — infra < $0.05 and no domain/tax)`);
}
console.log("  * = estimated (current partial month)");

console.log("");
console.log("Notes");
console.log("-----");
console.log("  • Gross = list-price usage. Net invoice ≈ out of pocket after credits.");
console.log("  • Route 53 is account-wide (all hosted zones), not RYDO-only.");
console.log("  • Registrar charges are not Project-tagged; attributed by service name.");
console.log("  • After next deploy with Project=rydo tags, filter Cost Explorer by that tag.");
console.log("  • Cost Explorer retains ~14 months; COST_START/COST_END override the window.");
console.log("  • Daily Other = ECR + S3 + CloudFront + CloudWatch + Route 53 + data transfer + ACM.");
' \
  "$TMPDIR_COSTS" \
  "$RYDO_DOMAIN"
