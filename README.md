# Codex Coach

Codex Coach is a local-first Codex plugin and CLI that helps a developer notice newer Codex workflows when they are relevant. It combines bundled official Codex changelog records, local capability evidence, recent repository metadata, and deterministic recommendations into one coaching readout.

The default readout has three sections:

- What's new: official Codex updates from the bundled changelog cache, filtered by the local last-seen timestamp.
- Capability map: Codex capabilities grouped by observed local evidence, demo fallback evidence, or unknown/not-observed status.
- Recent work review: recent git-derived work items, optional demo fallback work items, and recommendations from the local recommender state.

The repository currently ships the plugin under `plugins/codex-coach`; there is no root `package.json`.

## Repository Layout

Key files and directories:

| Path | Purpose |
| --- | --- |
| `plugins/codex-coach/package.json` | Node package for the CLI, MCP server, tests, and TypeScript build. |
| `plugins/codex-coach/src/cli.ts` | Commander-based CLI entry point. |
| `plugins/codex-coach/src/commands/` | CLI command registration and command runners. |
| `plugins/codex-coach/src/mcp/` | JSON-RPC MCP server and tool definitions. |
| `plugins/codex-coach/src/updates/` | Bundled Codex changelog loading, validation, import, and last-seen logic. |
| `plugins/codex-coach/src/capabilities/` | Capability taxonomy and local capability map. |
| `plugins/codex-coach/src/work-items/` | Git metadata and demo fallback work item generation. |
| `plugins/codex-coach/src/recommender/` | Local recommendation rules, state file, and feedback handling. |
| `plugins/codex-coach/src/hooks/` | Hook payload sanitization, observation storage, and derived capability events. |
| `plugins/codex-coach/data/codex-updates.json` | Bundled offline Codex changelog cache. |
| `plugins/codex-coach/hooks/hooks.json` | Plugin-bundled hook configuration. |
| `plugins/codex-coach/skills/coach/SKILL.md` | Skill instructions used by Codex when invoking the plugin. |
| `plugins/codex-coach/.codex-plugin/plugin.json` | Plugin manifest. |
| `plugins/codex-coach/.mcp.json` | MCP server configuration for the plugin. |
| `.agents/plugins/marketplace.json` | Repo-local marketplace entry pointing at `./plugins/codex-coach`. |

## Local Data

Codex Coach stores state in a plugin-owned data directory. Use `status --json` to see the exact path for the current environment.

Data directory resolution:

1. `--data-dir <path>`
2. `CODEX_COACH_DATA_DIR`
3. `XDG_DATA_HOME/codex-coach`
4. `~/.codex/memories/codex-coach` when `CODEX_SANDBOX` is set
5. `~/.local/share/codex-coach`

Current local files include:

| File | Written by | Notes |
| --- | --- | --- |
| `codex-coach.sqlite` | Storage layer | Local profile, Codex updates, capability events, hook observations, work item tables, recommendation tables, and feedback tables. |
| `recommender-state.json` | Recommender | Current source of truth for generated recommendations and recommendation feedback. If it is missing, the recommender seeds deterministic demo work items. |
| `hook-observations.jsonl` | Hook recorder | Append-only copy of sanitized hook observations. |
| `capability-events.jsonl` | Hook recorder | Append-only copy of capability events derived from hook observations. |

By default, Codex Coach uses metadata only:

- Git commit subjects, branch names, timestamps, filenames, and diff stats.
- Sanitized hook payload fields when hooks are enabled.
- Bundled official Codex changelog records cached locally.
- Demo fallback records when `--demo` is passed or when the recommender initializes an empty state.

Codex Coach does not read source file contents, raw prompts, raw logs, or full tool responses by default. Source labels for user summaries, Codex session metadata, plugin metadata, and local imports exist in the type system, but there are no current import commands for those sources.

## Prerequisites

- Node.js 20 or newer.
- npm.
- A Codex build with plugin support if you want to install and invoke the plugin through Codex.
- This repository checked out locally.

Install and build from the plugin package:

```sh
cd plugins/codex-coach
npm install
npm run build
cd ../..
```

Check that the command layer responds:

```sh
./plugins/codex-coach/bin/codex-coach status --json --repo .
```

The `bin/codex-coach` and `bin/codex-coach-mcp` wrappers build `dist/` on first use if the compiled entry point is missing.

## Install From The Repo-Local Marketplace

Codex Coach is installed as a local Codex plugin from this repository's marketplace metadata. The marketplace entry in `.agents/plugins/marketplace.json` points to:

```text
./plugins/codex-coach
```

The plugin manifest is:

```text
plugins/codex-coach/.codex-plugin/plugin.json
```

The manifest registers:

- Display name: `Codex Coach`
- Skills directory: `./skills/`
- MCP server config: `./.mcp.json`
- Icon/logo: `./assets/ccoach.png`

Install through Codex:

1. Open the Codex app or CLI plugin surface.
2. Choose the local or repo-local marketplace option.
3. Select the entry that points to `./plugins/codex-coach`.
4. Install `Codex Coach`.
5. Restart or reload Codex if prompted.

## Invoke From Codex

Start a Codex thread and invoke the installed plugin:

```text
@Codex Coach show what's new and review my recent work
```

Equivalent prompts include:

```text
Use Codex Coach to show what's new.
Use Codex Coach to review my recent work.
Use Codex Coach to reset the demo state.
```

The skill calls the local command layer, typically:

```sh
codex-coach coach --json --repo .
```

For direct local testing from the repo root:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo .
```

For a deterministic demo readout:

```sh
./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir /tmp/codex-coach-demo
```

## MCP Tools

Codex Coach exposes the CLI through an MCP server:

```text
plugins/codex-coach/.mcp.json
plugins/codex-coach/bin/codex-coach-mcp
```

The MCP server supports these tools:

- `status`
- `coach`
- `get_updates`
- `mark_updates_seen`
- `get_capability_map`
- `get_recent_work`
- `get_recommendations`
- `mark_recommendation_feedback`
- `import_changelog`
- `reset_demo_state`
- `record_hook_observation`
- `delete_local_history`

Tool arguments map to CLI flags. For example, MCP `dataDir` maps to `--data-dir`, `startupJson` maps to `--startup-json`, and `recommendationId` maps to `--recommendation-id`.

## Enable Hooks

Hooks are additive. Codex Coach still works from git metadata, bundled changelog data, recommender state, and demo fallback records when hooks are disabled.

When your Codex environment requires an explicit feature flag, add this to the Codex config file used by your app or CLI, commonly `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Then restart Codex. The plugin-bundled hook config lives at:

```text
plugins/codex-coach/hooks/hooks.json
```

That config includes:

- `SessionStart`: runs `codex-coach get_updates --demo --startup-json` and returns a compact startup system message.
- `PostToolUse`: records best-effort local hook observations for matching tool names.
- `Stop`: records a best-effort local stop observation.

The repo also includes `.codex/config.toml` and `.codex/hooks.json` for local development. The repo-local hook file currently wires a `SessionStart` hook to the repo-relative CLI path.

## Verify Hooks

Do not use SessionStart UI text as the only source of truth. Depending on the Codex surface, startup updates may appear only after the first interaction.

Verify stored observations instead:

```sh
DATA_DIR=/tmp/codex-coach-hooks

printf '%s\n' '{"session_id":"s1","turn_id":"t1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}' \
  | ./plugins/codex-coach/bin/codex-coach record_hook_observation --json --data-dir "$DATA_DIR"

printf '%s\n' '{"session_id":"s1","turn_id":"t2","hook_event_name":"Stop","cwd":".","stop_hook_active":false}' \
  | ./plugins/codex-coach/bin/codex-coach record_hook_observation --json --data-dir "$DATA_DIR"

./plugins/codex-coach/bin/codex-coach status --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach get_capability_map --json --data-dir "$DATA_DIR"
```

Useful verification signals:

- `data.counts.hook_observations` is greater than `0`.
- `data.hooks.last_observed_at` is not `null`.
- `get_capability_map --json` includes capability evidence with a `hook` source label.

Hook-derived records are best-effort local observations, not complete telemetry across every Codex surface.

## Command Reference

Run commands from the repo root:

```sh
./plugins/codex-coach/bin/codex-coach <command> --json
```

Global options:

| Option | Behavior |
| --- | --- |
| `--json` | Emits the stable JSON envelope used by the skill and MCP tools. |
| `--repo <path>` | Repository to inspect. Defaults to the current working directory. |
| `--data-dir <path>` | Overrides the local Codex Coach data directory. |
| `--demo` | Allows deterministic demo fallback data where implemented. |

Commands:

| Command | Purpose |
| --- | --- |
| `status` | Shows the data directory, profile state, hook hints, last update timestamp, and SQLite record counts. |
| `import_changelog` | Imports bundled Codex changelog entries into SQLite. `--refresh` is accepted but currently emits `refresh_not_enabled` and uses the bundled cache. |
| `get_updates` | Returns new-user highlights or changelog entries newer than the local last-seen timestamp. Seeds the bundled cache if it is empty. |
| `mark_updates_seen` | Updates `last_seen_updates_at`; accepts `--seen-at <timestamp>`. |
| `get_capability_map` | Returns grouped capability statuses from stored capability events. With `--demo`, uses demo capability events only when no events exist. |
| `get_recent_work` | Returns recent work items from local git metadata. With `--demo`, appends deterministic demo fallback work items. |
| `get_recommendations` | Returns deterministic recommendations from `recommender-state.json`. If the recommender state has no work items, it seeds demo work items. |
| `coach` | Returns the aggregate payload used by the skill: updates, capability map, recent work, recommendations, and profile. |
| `mark_recommendation_feedback` | Stores useful or not-useful feedback for a recommendation in `recommender-state.json`. |
| `record_hook_observation` | Reads a hook payload from stdin, stores sanitized metadata, and derives capability events when possible. |
| `reset_demo_state` | Clears SQLite history tables, seeds bundled changelog records, and sets the demo last-seen timestamp. |
| `delete_local_history` | Deletes Codex Coach SQLite storage files after safety checks. It does not currently remove `recommender-state.json` or hook JSONL files. |

Command-specific options:

| Command | Option | Behavior |
| --- | --- | --- |
| `get_updates` | `--startup-json` | Emits the compact SessionStart hook JSON form. |
| `mark_updates_seen` | `--seen-at <timestamp>` | Stores the provided ISO-compatible timestamp. |
| `mark_recommendation_feedback` | `--recommendation-id <id>` | Required recommendation ID. |
| `mark_recommendation_feedback` | `--rating useful\|not-useful` | Required feedback rating. |
| `mark_recommendation_feedback` | `--note <text>` | Optional feedback note. |
| `import_changelog` | `--refresh` | Accepted for compatibility; remote refresh is not enabled. |

Feedback example:

```sh
./plugins/codex-coach/bin/codex-coach mark_recommendation_feedback \
  --json \
  --recommendation-id <id-from-get_recommendations> \
  --rating useful \
  --note "Good fit for the layout debugging task"
```

## `--repo <path>` Behavior

`--repo <path>` selects the repository whose metadata Codex Coach should inspect. It defaults to the current working directory.

The git importer validates that the path is a readable git work tree, resolves the git root, reads current branch metadata, reads up to 12 recent non-merge commits, and uses commit subjects, timestamps, filenames, and numstat diff stats. It does not read source file contents.

`get_recent_work` filters administrative commits, returns up to 6 git work items, and marks sparse history with a warning when applicable.

Examples:

```sh
./plugins/codex-coach/bin/codex-coach get_recent_work --json --repo .
./plugins/codex-coach/bin/codex-coach coach --json --repo /path/to/another/repo
```

An invalid repo path returns a non-zero exit with the standard JSON error envelope when `--json` is present. The inspected repo is separate from the plugin data directory.

## Changelog Cache Behavior

`import_changelog` imports bundled, normalized Codex changelog records so the plugin works offline. The bundled entries are:

- `2026-04-23`: GPT-5.5 and Codex app updates.
- `2026-04-16-app`: Codex can now help with more of your work.
- `2026-04-07`: Codex model availability update.
- `2026-03-25`: Build and install plugins in Codex.

Every update must preserve a real Codex changelog source URL. `--refresh` does not fetch remote changelog data in the current implementation; it returns a warning and uses the bundled cache.

Use `mark_updates_seen` after a readout if you want the next run to show only newer updates.

## Demo Behavior

Demo behavior is deterministic and local. It does not require network access or an external API call.

`reset_demo_state` currently clears SQLite history tables, seeds the bundled changelog records, and sets `last_seen_updates_at` to:

```text
2026-03-24T00:00:00.000Z
```

`--demo` affects readout commands as follows:

- `get_updates`: uses the fixed demo last-seen timestamp so the bundled updates appear as deltas.
- `get_capability_map`: uses demo capability events only when no stored capability events exist.
- `get_recent_work`: appends deterministic demo fallback work items to git-derived work items.
- `coach`: inherits the demo behavior of its component commands.

The recommender seeds deterministic demo work items when `recommender-state.json` has no work items, regardless of `--demo`.

Generated fallback records use:

```text
source: demo-fallback
```

The demo-critical fallback work items are:

- `Debugged settings page layout across desktop and mobile`
- `Large refactor across auth and billing`

Expected recommendations:

- The settings layout work item recommends `computer-use` or `multimodal-input`.
- The auth and billing refactor recommends `parallel-agents` or `cloud-task`.

Fallback labeling applies to demo work items and capability events only. Changelog updates are always bundled official records with source URLs.

## Demo Reset

Use a temporary data directory for repeatable rehearsals:

```sh
DATA_DIR=/tmp/codex-coach-demo

./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach import_changelog --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir "$DATA_DIR"
```

After reset and a demo readout, expect:

- At least three bundled Codex changelog updates with URLs.
- A capability map with at least one `not_observed` capability.
- The two demo fallback work items listed above.
- A `computer-use` or `multimodal-input` recommendation for the settings layout work item.
- A `parallel-agents` or `cloud-task` recommendation for the auth and billing refactor work item.

## Delete Local History

Use `delete_local_history` to remove the SQLite storage files after inspecting the data directory:

```sh
./plugins/codex-coach/bin/codex-coach status --json
./plugins/codex-coach/bin/codex-coach delete_local_history --json
```

For demos and tests, pass the same `--data-dir` you used for the run:

```sh
./plugins/codex-coach/bin/codex-coach delete_local_history --json --data-dir /tmp/codex-coach-demo
```

Current safety checks refuse to delete:

- The filesystem root.
- The home directory.
- A data directory inside the inspected repo.
- A non-default data directory unless `--data-dir` was explicitly provided.

Current deletion removes `codex-coach.sqlite` and related SQLite sidecar files only. It does not remove `recommender-state.json`, `hook-observations.jsonl`, or `capability-events.jsonl`.

## Verification Harness

The optional harness runs the key CLI commands against a temporary data directory:

```sh
plugins/codex-coach/scripts/verify-demo.sh
```

Use strict mode for demo assertions:

```sh
plugins/codex-coach/scripts/verify-demo.sh --strict
```

Smoke mode validates JSON envelopes and records outputs for inspection. Strict mode additionally checks the required demo moments, fallback labels, recommendation capabilities, and hook verification through stored observations.

## Development

Run tests from the plugin package:

```sh
cd plugins/codex-coach
npm test
```

Useful scripts:

| Script | Behavior |
| --- | --- |
| `npm run build` | Compiles TypeScript to `dist/`. |
| `npm run typecheck` | Runs TypeScript without emitting files. |
| `npm test` | Runs typecheck, build, and Node's test runner against compiled tests. |
| `npm run prepare` | Builds the package. |

Generated directories such as `plugins/codex-coach/dist/` and `plugins/codex-coach/node_modules/` are ignored by git.

## Troubleshooting

Missing marketplace entries:

- Confirm `.agents/plugins/marketplace.json` exists in the repo root.
- Confirm its Codex Coach entry points to `./plugins/codex-coach`.
- Confirm `plugins/codex-coach/.codex-plugin/plugin.json` exists and uses relative `./` paths.
- Restart or reload Codex after installation.
- Use direct CLI commands if the Codex plugin surface is unavailable.

Disabled hooks:

- Add `[features] codex_hooks = true` to the Codex config that your app or CLI actually uses.
- Restart Codex.
- Run the stored-observation verification commands above.
- Remember that hooks are additive; missing hook observations should not block changelog, git, recommender, or demo fallback output.

Empty git history:

- Pass `--repo <path>` for the repository you want to inspect.
- Confirm the path is a git repository.
- Use `--demo` for rehearsal so deterministic fallback work items appear with `source: demo-fallback`.

Missing Node dependencies:

- Use Node.js 20 or newer.
- Run `npm install` in `plugins/codex-coach`.
- Run `npm run build` or let `bin/codex-coach` build on first use.

No changelog updates after a prior run:

- Run `reset_demo_state` for demo rehearsal.
- Or run `mark_updates_seen --seen-at <older-timestamp>` in a test data directory.
- Confirm `import_changelog` has populated the local cache.

Local data deletion:

- Run `status --json` first and inspect `data.data_dir`.
- Use `delete_local_history --json` with the same `--data-dir` used for the demo.
- Remember that the current command deletes SQLite files only.
