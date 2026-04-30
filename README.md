# Codex Coach

Codex Coach is a local-first Codex plugin that helps a developer notice newer Codex workflows at the moment they are useful. It combines real Codex changelog updates, a local capability usage map, and recent repository work metadata into one coaching readout.

The default readout has three sections:

- What's new: real Codex updates since the local last-seen timestamp.
- Capability map: Codex workflows that were used recently, tried before, not observed, or cannot be assessed from local signals.
- Recent work review: recent work items and deterministic recommendations for Codex capabilities to try next time.

The hackathon demo is designed to show a local install, a Codex thread invocation, deterministic demo reset, feedback on a recommendation, and local history deletion.

## Local Data

Codex Coach stores plugin state locally in a plugin-owned data directory. Use `status --json` to see the exact path for your environment.

By default, Codex Coach uses metadata only:

- Git branch names, commit messages, timestamps, filenames, and diff stats.
- Hook observations when Codex hooks are enabled.
- Real Codex changelog records cached locally from bundled data.
- User-provided summaries or local exports only when you explicitly point Codex Coach at them.

Codex Coach does not read source file contents, raw prompts, raw logs, or full tool responses by default. Importers for Codex session metadata, plugin metadata, local exports, or logs must be explicitly approved by the user before they read those files; otherwise those sources are skipped.

The MVP demo does not require network access or an external API call. Generated demo fallback records are labeled with `source: demo-fallback`; real Codex changelog updates are never faked.

## Prerequisites

- Node.js 20 or newer.
- npm.
- A Codex build with plugin support for the app or CLI installation path.
- This repository checked out locally.

Install the CLI dependencies from the repo root:

```sh
cd plugins/codex-coach
npm install
npm run build
cd ../..
```

Check that the local command layer responds:

```sh
./plugins/codex-coach/bin/codex-coach status --json --repo .
```

If the output includes `placeholder_implementation`, the command contract is present but the corresponding feature workstream has not been merged yet. The final integrated demo should not rely on placeholder output.

## Install From The Repo-Local Marketplace

Codex Coach is installed as a local Codex plugin from the marketplace metadata in this repository. In the fully integrated build, `.agents/plugins/marketplace.json` points to:

```text
./plugins/codex-coach
```

The plugin manifest lives at:

```text
plugins/codex-coach/.codex-plugin/plugin.json
```

Install through the Codex app:

1. Open the Codex app.
2. Open the plugin directory or plugin marketplace.
3. Choose the local or repo-local marketplace option.
4. Select this repository's marketplace entry.
5. Install `Codex Coach`.
6. Restart or reload Codex if the app asks you to.
7. Confirm the installed plugin root resolves to `./plugins/codex-coach`.

If `.agents/plugins/marketplace.json` or `.codex-plugin/plugin.json` is missing, the plugin install-surface stream has not been merged into your checkout. You can still use the CLI commands directly and use the CLI `/plugins` fallback after that stream lands.

## Invoke From Codex

Start a new Codex thread and invoke the plugin with either the installed skill or a direct plugin mention:

```text
@Codex Coach show what's new and review my recent work
```

Equivalent prompts should also work:

```text
Use Codex Coach to show what's new.
Use Codex Coach to review my recent work.
```

The skill should call the local command layer, typically:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo .
```

For a deterministic demo, include `--demo` after running `reset_demo_state`:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo
```

## CLI `/plugins` Fallback

Use the CLI fallback if the Codex app plugin directory is unavailable or unstable:

1. Start Codex CLI in this repository.
2. Run `/plugins`.
3. Choose the local marketplace or install-from-local-repo option.
4. Select the marketplace entry that points to `./plugins/codex-coach`.
5. Restart the Codex CLI session if prompted.
6. Invoke `@Codex Coach` or ask Codex to use Codex Coach.

If the slash command is unavailable, run the CLI command directly:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo
```

## Enable Hooks

Hooks are additive. Codex Coach still works from git metadata, changelog data, and demo fallback records when hooks are disabled.

When your Codex environment requires an explicit feature flag, add this to the Codex config file used by your app or CLI, commonly `~/.codex/config.toml`:

```toml
[features]
codex_hooks = true
```

Then restart Codex. The plugin-bundled hook config is expected at:

```text
plugins/codex-coach/hooks/hooks.json
```

The hook capture stream configures supported lifecycle events such as `PostToolUse` and `Stop` to call `codex-coach record_hook_observation`.

## Verify Hooks

Do not use SessionStart UI text as the source of truth. Depending on the Codex surface, a SessionStart warning or status line may appear only after the first interaction rather than directly under the startup banner.

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

In a complete hook build, treat these stored values as the verification result:

- `data.counts.hook_observations` is greater than `0`, or `data.hooks.last_observed_at` is not `null`.
- `get_capability_map --json` includes capability evidence with a `hook` source label or best-effort hook observation wording.

Hook-derived records are best-effort local observations, not complete telemetry across every Codex surface.

## Command Reference

Run commands from the repo root:

```sh
./plugins/codex-coach/bin/codex-coach <command> --json
```

Global options:

| Option | Behavior |
| --- | --- |
| `--json` | Emits the stable JSON envelope used by the skill and future tool wrappers. |
| `--repo <path>` | Repository to inspect. Defaults to the current working directory. |
| `--data-dir <path>` | Overrides the local Codex Coach data directory. Useful for tests and demos. |
| `--demo` | Allows deterministic demo fallback data when real local signals are sparse. |

Commands:

| Command | Purpose |
| --- | --- |
| `status` | Shows the data directory, profile state, hook hints, last update timestamp, and record counts. |
| `import_changelog` | Imports bundled real Codex changelog entries into the local cache. `--refresh` may fetch official sources if implemented. |
| `get_updates` | Returns changelog entries newer than the local last-seen timestamp or new-user highlights. |
| `mark_updates_seen` | Updates `last_seen_updates_at`; accepts `--seen-at <timestamp>` for tests. |
| `get_capability_map` | Returns grouped capability statuses and supporting local evidence. |
| `get_recent_work` | Returns recent work items from local git metadata, hooks, imports, and demo fallback when allowed. |
| `get_recommendations` | Returns deterministic recommendations for recent work. |
| `coach` | Returns the aggregate payload used by the Codex Coach skill. |
| `mark_recommendation_feedback` | Stores useful or not-useful feedback for a recommendation. |
| `record_hook_observation` | Reads a Codex hook payload from stdin and stores allowed metadata only. |
| `reset_demo_state` | Resets local demo timestamps and seeds deterministic fallback records. |
| `delete_local_history` | Deletes plugin-owned local history only. |

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

The git importer uses metadata such as commit messages, branch names, file paths, timestamps, file counts, and diff stats. It does not read source file contents by default.

Examples:

```sh
./plugins/codex-coach/bin/codex-coach get_recent_work --json --repo .
./plugins/codex-coach/bin/codex-coach coach --json --repo /path/to/another/repo
```

An invalid repo path should return a non-zero exit with the standard JSON error envelope when `--json` is present. The inspected repo is separate from the plugin data directory; deleting local Codex Coach history must not delete the repo.

## Changelog Cache Behavior

`import_changelog` imports bundled, normalized Codex changelog records so the demo works offline. The required bundled entries are:

- `2026-04-23`: GPT-5.5 and Codex app updates.
- `2026-04-16-app`: richer Codex app workflows.
- `2026-04-07`: Codex model availability update.
- `2026-03-25`: build and install plugins in Codex.

Every update must preserve a real Codex changelog source URL. Optional refresh mode may fetch newer official Codex changelog entries, but it must fall back to the local cache with a warning if refresh fails. Codex Coach must not invent product updates.

Use `mark_updates_seen` after a readout if you want the next run to show only newer updates.

## Demo Fallback Labeling

`--demo` and `reset_demo_state` may seed fallback capability events or work items when real local history is sparse. All generated fallback records must use:

```text
source: demo-fallback
```

The demo-critical fallback work items are:

- `Debugged settings page layout across desktop and mobile`
- `Large refactor across auth and billing`

Expected recommendations:

- The settings layout work item should recommend `computer-use` or `multimodal-input`.
- The auth and billing refactor should recommend `parallel-agents` or `cloud-task`.

Fallback labeling applies to demo work items and capability events only. Changelog updates must always be real records with source URLs.

## Demo Reset

Use a temporary data directory for repeatable rehearsals:

```sh
DATA_DIR=/tmp/codex-coach-demo

./plugins/codex-coach/bin/codex-coach reset_demo_state --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach import_changelog --json --data-dir "$DATA_DIR"
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir "$DATA_DIR"
```

After reset, the demo should show:

- At least three real Codex changelog updates with URLs.
- A capability map with at least one `not_observed` capability.
- `Debugged settings page layout across desktop and mobile`.
- A `computer-use` or `multimodal-input` recommendation for that work item.
- `Large refactor across auth and billing`.
- A `parallel-agents` or `cloud-task` recommendation for that work item.

## Delete Local History

Use `delete_local_history` to remove plugin-owned local data:

```sh
./plugins/codex-coach/bin/codex-coach status --json
./plugins/codex-coach/bin/codex-coach delete_local_history --json
```

For demos and tests, pass the same `--data-dir` you used for the run:

```sh
./plugins/codex-coach/bin/codex-coach delete_local_history --json --data-dir /tmp/codex-coach-demo
```

The command is expected to delete only Codex Coach data under the resolved plugin data directory or explicit `--data-dir`. It must not delete the inspected repository, plugin source, `node_modules`, or build output.

## Verification Harness

The optional harness runs the key CLI commands against a temporary data directory:

```sh
plugins/codex-coach/scripts/verify-demo.sh
```

Use strict mode after the feature streams are merged:

```sh
plugins/codex-coach/scripts/verify-demo.sh --strict
```

Smoke mode validates JSON envelopes and records outputs for inspection. Strict mode additionally checks the required demo moments, fallback labels, recommendation capabilities, and hook verification through stored observations.

## Troubleshooting

Missing marketplace entries:

- Confirm `.agents/plugins/marketplace.json` exists in the repo root.
- Confirm its Codex Coach entry points to `./plugins/codex-coach`.
- Confirm `plugins/codex-coach/.codex-plugin/plugin.json` exists and uses relative `./` paths.
- Restart or reload Codex after installation.
- Use CLI `/plugins` or direct CLI commands if the app plugin directory is unavailable.

Disabled hooks:

- Add `[features] codex_hooks = true` to the Codex config that your app or CLI actually uses.
- Restart Codex.
- Run the stored-observation verification commands above.
- Remember that hooks are additive; missing hook observations should not block changelog, git, or demo fallback output.

Empty git history:

- Pass `--repo <path>` for the repository you want to inspect.
- Confirm the path is a git repository.
- Use `--demo` for hackathon rehearsal so sparse-history fallback records appear with `source: demo-fallback`.

Missing Node dependencies:

- Use Node.js 20 or newer.
- Run `npm install` in `plugins/codex-coach`.
- Run `npm run build` or let `bin/codex-coach` build on first use.

No changelog updates after a prior run:

- Run `reset_demo_state` for the hackathon demo.
- Or run `mark_updates_seen --seen-at <older-timestamp>` in a test data directory.
- Confirm `import_changelog` has populated the local cache.

Local data deletion:

- Run `status --json` first and inspect `data.data_dir`.
- Use `delete_local_history --json` with the same `--data-dir` used for the demo.
- If you manually remove files, delete only the reported Codex Coach data directory.
