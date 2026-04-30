#!/usr/bin/env bash
set -euo pipefail

STRICT=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --strict)
      STRICT=1
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: plugins/codex-coach/scripts/verify-demo.sh [--strict]

Runs Codex Coach demo commands against a temporary data directory.

Default smoke mode validates JSON envelopes and records outputs.
Strict mode additionally enforces the required hackathon demo moments.
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PLUGIN_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(CDPATH= cd -- "$PLUGIN_ROOT/../.." && pwd)
BIN="$PLUGIN_ROOT/bin/codex-coach"
DATA_DIR="${CODEX_COACH_VERIFY_DATA_DIR:-$(mktemp -d /tmp/codex-coach-verify.XXXXXX)}"
OUTPUT_DIR="${CODEX_COACH_VERIFY_OUTPUT_DIR:-$(mktemp -d /tmp/codex-coach-verify-output.XXXXXX)}"

if [ ! -x "$BIN" ]; then
  echo "Missing executable: $BIN" >&2
  exit 1
fi

if [ ! -d "$PLUGIN_ROOT/node_modules" ]; then
  echo "Missing node_modules. Run: cd plugins/codex-coach && npm install" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"
mkdir -p "$OUTPUT_DIR"

echo "Using data dir: $DATA_DIR"
echo "Writing outputs to: $OUTPUT_DIR"

assert_envelope() {
  local file="$1"
  local expected_command="$2"
  node - "$file" "$expected_command" <<'NODE'
const fs = require("fs");
const [file, expectedCommand] = process.argv.slice(2);
const raw = fs.readFileSync(file, "utf8");
let doc;
try {
  doc = JSON.parse(raw);
} catch (error) {
  console.error(`${file}: invalid JSON`);
  throw error;
}
if (doc.ok !== true) {
  throw new Error(`${file}: expected ok:true, got ${JSON.stringify(doc.error || doc)}`);
}
if (doc.command !== expectedCommand) {
  throw new Error(`${file}: expected command ${expectedCommand}, got ${doc.command}`);
}
if (typeof doc.generated_at !== "string") {
  throw new Error(`${file}: missing generated_at`);
}
if (!Array.isArray(doc.warnings)) {
  throw new Error(`${file}: warnings must be an array`);
}
if (!Array.isArray(doc.sources)) {
  throw new Error(`${file}: sources must be an array`);
}
if (!doc.data || typeof doc.data !== "object") {
  throw new Error(`${file}: missing data object`);
}
NODE
}

run_json() {
  local label="$1"
  local expected_command="$2"
  shift 2
  local outfile="$OUTPUT_DIR/${label}.json"
  echo "Running $expected_command -> $outfile"
  "$BIN" "$@" --json --data-dir "$DATA_DIR" > "$outfile"
  assert_envelope "$outfile" "$expected_command"
}

run_hook_json() {
  local label="$1"
  local payload="$2"
  local outfile="$OUTPUT_DIR/${label}.json"
  echo "Running record_hook_observation -> $outfile"
  printf '%s\n' "$payload" | "$BIN" record_hook_observation --json --data-dir "$DATA_DIR" > "$outfile"
  assert_envelope "$outfile" "record_hook_observation"
}

run_json "01_status" "status" status --repo "$REPO_ROOT"
run_json "02_import_changelog" "import_changelog" import_changelog
run_json "03_reset_demo_state" "reset_demo_state" reset_demo_state
run_json "04_get_updates" "get_updates" get_updates
run_json "05_get_capability_map" "get_capability_map" get_capability_map --demo
run_json "06_get_recent_work" "get_recent_work" get_recent_work --repo "$REPO_ROOT" --demo
run_json "07_get_recommendations" "get_recommendations" get_recommendations --demo
run_json "08_coach" "coach" coach --repo "$REPO_ROOT" --demo
run_hook_json "09_hook_post_tool_use" '{"session_id":"verify","turn_id":"t1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}'
run_hook_json "10_hook_stop" '{"session_id":"verify","turn_id":"t2","hook_event_name":"Stop","cwd":".","stop_hook_active":false}'
run_json "11_status_after_hooks" "status" status --repo "$REPO_ROOT"
run_json "12_capability_map_after_hooks" "get_capability_map" get_capability_map
run_json "13_mark_updates_seen" "mark_updates_seen" mark_updates_seen

RECOMMENDATION_ID=$(
  node - "$OUTPUT_DIR/07_get_recommendations.json" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const doc = JSON.parse(fs.readFileSync(file, "utf8"));
const id = doc.data && Array.isArray(doc.data.recommendations) && doc.data.recommendations[0] && doc.data.recommendations[0].id;
if (id) process.stdout.write(id);
NODE
)

if [ -n "$RECOMMENDATION_ID" ]; then
  run_json "14_mark_recommendation_feedback" "mark_recommendation_feedback" \
    mark_recommendation_feedback --recommendation-id "$RECOMMENDATION_ID" --rating useful
else
  echo "Skipping feedback command in smoke mode: no recommendation ID found."
fi

run_json "15_delete_local_history" "delete_local_history" delete_local_history

if [ "$STRICT" -eq 1 ]; then
  node - "$OUTPUT_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const dir = process.argv[2];

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

function values(obj) {
  if (!obj || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj.flatMap(values);
  return [obj, ...Object.values(obj).flatMap(values)];
}

const updatesDoc = read("04_get_updates");
const capDoc = read("05_get_capability_map");
const workDoc = read("06_get_recent_work");
const recDoc = read("07_get_recommendations");
const statusAfterHooks = read("11_status_after_hooks");
const capAfterHooks = read("12_capability_map_after_hooks");

const updates = [
  ...(updatesDoc.data.updates || []),
  ...(updatesDoc.data.recent_highlights || [])
];
const uniqueUpdates = new Map(updates.map((update) => [update.id, update]));
if (uniqueUpdates.size < 3) {
  fail(`Expected at least three real updates, found ${uniqueUpdates.size}`);
}
for (const update of uniqueUpdates.values()) {
  if (typeof update.source_url !== "string" || !update.source_url.startsWith("https://developers.openai.com/codex/changelog#")) {
    fail(`Update ${update.id || "(unknown)"} does not have a real Codex changelog URL`);
  }
}

if (!capDoc.data.summary || capDoc.data.summary.not_observed < 1) {
  fail("Expected at least one not_observed capability");
}

const workItems = workDoc.data.work_items || [];
const byTitle = new Map(workItems.map((item) => [item.title, item]));
const layout = byTitle.get("Debugged settings page layout across desktop and mobile");
const refactor = byTitle.get("Large refactor across auth and billing");
if (!layout) fail("Missing layout debugging work item");
if (!refactor) fail("Missing auth and billing refactor work item");

const recs = recDoc.data.recommendations || [];
const recsByWorkItem = new Map();
for (const rec of recs) {
  if (!recsByWorkItem.has(rec.work_item_id)) recsByWorkItem.set(rec.work_item_id, []);
  recsByWorkItem.get(rec.work_item_id).push(rec);
}
const layoutCapabilities = new Set((recsByWorkItem.get(layout.id) || []).map((rec) => rec.capability));
const refactorCapabilities = new Set((recsByWorkItem.get(refactor.id) || []).map((rec) => rec.capability));
if (!layoutCapabilities.has("computer-use") && !layoutCapabilities.has("multimodal-input")) {
  fail("Layout work item needs a computer-use or multimodal-input recommendation");
}
if (!refactorCapabilities.has("parallel-agents") && !refactorCapabilities.has("cloud-task")) {
  fail("Refactor work item needs a parallel-agents or cloud-task recommendation");
}

const allObjects = [
  ...values(updatesDoc.data),
  ...values(capDoc.data),
  ...values(workDoc.data),
  ...values(recDoc.data)
];
for (const obj of allObjects) {
  if (obj && obj.source === "demo-fallback") continue;
  if (obj && typeof obj.source === "string" && obj.source.includes("fallback") && obj.source !== "demo-fallback") {
    fail(`Fallback-like record has unexpected source label: ${obj.source}`);
  }
}

const hookCount = statusAfterHooks.data.counts && statusAfterHooks.data.counts.hook_observations;
const hookLastObserved = statusAfterHooks.data.hooks && statusAfterHooks.data.hooks.last_observed_at;
const hookEvidence = values(capAfterHooks.data).some((obj) => {
  if (!obj || typeof obj !== "object") return false;
  if (obj.source === "hook") return true;
  if (Array.isArray(obj.sources)) return obj.sources.some((source) => source && source.label === "hook");
  return false;
});
if (!(hookCount > 0 || hookLastObserved || hookEvidence)) {
  fail("Hook verification must use stored observations or hook-sourced capability evidence");
}

console.log("Strict demo checks passed.");
NODE
fi

echo "Verification complete. Data dir: $DATA_DIR"
echo "Verification outputs remain in: $OUTPUT_DIR"
