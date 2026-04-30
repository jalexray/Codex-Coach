# Codex Coach Demo Script

This script is written for a deterministic hackathon demo. It assumes the fully integrated build is available, including the repo-local marketplace entry, plugin manifest, coach skill, changelog cache, demo fallback records, recommender, feedback command, and hook command.

## Setup

From the repo root:

```sh
cd plugins/codex-coach
npm install
npm run build
cd ../..
```

Prepare a repeatable demo data directory:

```sh
DATA_DIR=/tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach import_changelog --json --data-dir "$DATA_DIR"
```

Optional CLI rehearsal:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir "$DATA_DIR"
```

Confirm before going live:

- At least three real Codex changelog updates appear with source URLs.
- The capability map has at least one `not_observed` capability.
- `Debugged settings page layout across desktop and mobile` appears.
- That work item has a `computer-use` or `multimodal-input` recommendation.
- `Large refactor across auth and billing` appears.
- That work item has a `parallel-agents` or `cloud-task` recommendation.

## Required Demo Moments

The live demo must include these exact moments:

1. Open the Codex app plugin directory.
2. Show Codex Coach installed from the repo-local marketplace.
3. Start a new Codex thread.
4. Invoke Codex Coach.
5. Show at least three Codex updates since the reset last-seen timestamp.
6. Show a capability map with at least one not-observed feature.
7. Show recent local work items.
8. Show `Debugged settings page layout across desktop and mobile`.
9. Show a `computer-use` or `multimodal-input` recommendation for that work item.
10. Show `Large refactor across auth and billing`.
11. Show a `parallel-agents` or `cloud-task` recommendation.
12. Mark one recommendation useful.

## Happy Path

### 0:00 - 0:20, Open With The Missed Workflow

"Last week, Maya shipped what looked like a small settings page layout fix. It turned into breakpoint chasing across desktop and mobile. Later, a teammate asked whether she had used Codex computer use to inspect the rendered page directly. She had not. She was using Codex like a smarter terminal while newer Codex workflows had moved on."

### 0:20 - 0:35, Install Surface

Open the Codex app plugin directory.

Show `Codex Coach` installed from the repo-local marketplace. If the app exposes the path, point out that the marketplace entry resolves to:

```text
./plugins/codex-coach
```

Say:

"This is a local-first Codex plugin installed from this repo's local marketplace. It is not a hosted dashboard."

### 0:35 - 0:50, Invoke In A New Thread

Start a new Codex thread and invoke:

```text
@Codex Coach show what's new and review my recent work
```

If you need to narrate what the skill does:

"The skill calls the local `codex-coach coach --json` command and asks Codex to render the structured result."

### 0:50 - 1:10, What's New

Show the `What's new` section.

Required callout:

"These are real Codex changelog entries cached locally for the demo, not invented product updates."

Point to at least three updates since the reset last-seen timestamp. The expected demo set comes from the real 2026-04-23, 2026-04-16 app, 2026-04-07, and 2026-03-25 Codex changelog entries.

### 1:10 - 1:25, Capability Map

Show the capability map.

Required callout:

"This separates used recently, tried before, not observed, and unknown or not connected. Hook data is best-effort local observation, not complete telemetry."

Point to at least one `not_observed` feature.

### 1:25 - 1:50, Recent Work And Recommendations

Show recent local work items.

First required work item:

```text
Debugged settings page layout across desktop and mobile
```

Land the key recommendation:

"For this kind of responsive UI debugging, Codex Coach recommends `computer-use` or `multimodal-input`, because Codex could inspect the rendered desktop and mobile states instead of relying only on text descriptions."

Second required work item:

```text
Large refactor across auth and billing
```

Land the second recommendation:

"For a broad refactor across auth and billing, Codex Coach recommends `parallel-agents` or `cloud-task`, because independent areas can be split and reviewed separately."

### 1:50 - 2:05, Feedback

Mark one recommendation useful in the UI if available. If the UI action is not wired, run or show the equivalent command:

```sh
./plugins/codex-coach/bin/codex-coach mark_recommendation_feedback \
  --json \
  --data-dir "$DATA_DIR" \
  --recommendation-id <recommendation-id> \
  --rating useful
```

Say:

"Feedback is stored locally with the recommendation record."

### 2:05 - 2:20, Privacy And Close

Close with:

"Codex Coach uses local metadata by default: changelog cache, git metadata, and hook observations when enabled. It does not read source contents, raw prompts, or raw logs by default. The goal is simple: turn 'what changed?' and 'what did I just do?' into the next Codex workflow worth trying."

## CLI Fallback Path

Use this path if the Codex app plugin directory is unavailable.

1. Start Codex CLI in this repository.
2. Run `/plugins`.
3. Install Codex Coach from the repo-local marketplace entry that points to `./plugins/codex-coach`.
4. Restart the CLI session if prompted.
5. Invoke `@Codex Coach show what's new and review my recent work`.

If the slash command itself is unavailable, show the local command payload directly:

```sh
DATA_DIR=/tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach import_changelog --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir "$DATA_DIR"
```

Narration for fallback:

"The plugin experience and the fallback both use the same local command layer. The UI is different, but the data source and recommendation rules are the same."

## Hook Demo Note

Only include hooks in the live demo if they are already enabled and stable in the environment.

If needed, show the config requirement:

```toml
[features]
codex_hooks = true
```

Verify hooks with stored observations, not SessionStart UI output:

```sh
DATA_DIR=/tmp/codex-coach-demo-hooks

printf '%s\n' '{"session_id":"demo","turn_id":"tool-1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}' \
  | ./plugins/codex-coach/bin/codex-coach record_hook_observation --json --data-dir "$DATA_DIR"

./plugins/codex-coach/bin/codex-coach status --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach get_capability_map --json --data-dir "$DATA_DIR"
```

The stored observation count or hook-sourced capability evidence is the verification result.

## Reset Between Rehearsals

Use a fresh data directory or run:

```sh
./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir "$DATA_DIR"
```

When a rehearsal is finished, delete local plugin history for that demo directory:

```sh
./plugins/codex-coach/bin/codex-coach delete_local_history --json --data-dir "$DATA_DIR"
```

Do not manually delete repository files for a demo reset. The reset and deletion commands operate on plugin-owned local state.
