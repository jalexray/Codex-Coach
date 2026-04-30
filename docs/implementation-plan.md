# Codex Coach Implementation Plan

Last updated: April 30, 2026

Sources:

- `docs/hackathon-spec.md`
- `docs/technical-requirements.md`

## 1. Goal

Build Codex Coach as an installable local-first Codex plugin for the hackathon demo. The implementation should move quickly by splitting the technical plan into independent workstreams, each developed in its own git worktree and merged through a small number of integration gates.

The MVP is complete when a fresh local install can:

1. Install Codex Coach from the repo-local plugin marketplace.
2. Invoke the bundled coach skill from Codex.
3. Run `codex-coach coach --json`.
4. Show the three required readout sections:
   - What's new
   - Capability map
   - Recent work review
5. Reset the demo state and reliably show:
   - At least three real Codex changelog updates.
   - `Debugged settings page layout across desktop and mobile`.
   - A `computer-use` or `multimodal-input` recommendation.
   - `Large refactor across auth and billing`.
   - A `parallel-agents` or `cloud-task` recommendation.
6. Store data locally, label fallback data, support feedback, and support local history deletion.

## 2. Worktree Strategy

Use short-lived branches with one sibling worktree per workstream. Keep `main` as the integration target.

Suggested branch and worktree naming:

```sh
git worktree add ../Codex-Coach-foundation -b codex/ws-foundation main
git worktree add ../Codex-Coach-plugin-surface -b codex/ws-plugin-surface main
git worktree add ../Codex-Coach-cli-storage -b codex/ws-cli-storage main
git worktree add ../Codex-Coach-updates -b codex/ws-updates main
git worktree add ../Codex-Coach-capabilities -b codex/ws-capabilities main
git worktree add ../Codex-Coach-git-importer -b codex/ws-git-importer main
git worktree add ../Codex-Coach-hooks -b codex/ws-hooks main
git worktree add ../Codex-Coach-recommender -b codex/ws-recommender main
git worktree add ../Codex-Coach-coach-aggregator -b codex/ws-coach-aggregator main
git worktree add ../Codex-Coach-docs-demo -b codex/ws-docs-demo main
```

Recommended flow:

1. Land `codex/ws-foundation` first. It creates the package skeleton, command registry, shared schemas, capability taxonomy stub, and placeholder commands.
2. Rebase or recreate the remaining worktrees from the updated `main`.
3. Run the remaining streams in parallel with strict file ownership.
4. Merge through the integration checkpoints in Section 9.

If the team cannot land the foundation branch first, each stream can still start in parallel, but the integration lead should expect conflicts in package metadata, command registration, shared types, and README sections.

### Copy/Paste Workstream Prompts

Use one prompt per Codex session after creating each worktree from the updated `main`. Keep the stated file ownership boundaries unless the integration lead explicitly coordinates a cross-stream edit.

#### WS0 Foundation

Use this prompt only if the foundation branch needs to be recreated or repaired.

```text
You are working in /Users/xray/software/Codex-Coach-foundation on branch codex/ws-foundation.

Implement WS0 from docs/implementation-plan.md: Foundation and Integration Skeleton.

Own only:
- .gitignore
- plugins/codex-coach/package.json
- plugins/codex-coach/tsconfig.json
- plugins/codex-coach/bin/codex-coach
- plugins/codex-coach/src/cli.ts
- plugins/codex-coach/src/commands/index.ts
- plugins/codex-coach/src/lib/json.ts
- plugins/codex-coach/src/lib/errors.ts
- plugins/codex-coach/src/lib/time.ts
- plugins/codex-coach/src/capabilities/taxonomy.ts
- plugins/codex-coach/src/types/*.ts
- placeholder command modules

Create a thin TypeScript CLI skeleton with an executable codex-coach binary, shared JSON envelope helpers, shared source labels, capability taxonomy constants, global option parsing, a command registry, and placeholder implementations for every required command. Keep the branch intentionally thin and do not implement storage, changelog import, hooks, plugin manifest, skill markdown, or README behavior.

Before finishing, run:
- cd plugins/codex-coach
- npm install
- npm run typecheck
- ./bin/codex-coach status --json
- ./bin/codex-coach coach --json
```

#### WS1 Plugin Install Surface and Skill

```text
You are working in /Users/xray/software/Codex-Coach-plugin-surface on branch codex/ws-plugin-surface.

Implement WS1 from docs/implementation-plan.md: Plugin Install Surface and Skill.

Own only:
- plugins/codex-coach/.codex-plugin/plugin.json
- plugins/codex-coach/skills/coach/SKILL.md
- .agents/plugins/marketplace.json
- optional plugins/codex-coach/assets/icon.png

Do not edit CLI source except to inspect command names and output shapes. Follow the spec: manifest paths must be relative ./ paths, the marketplace entry must point to ./plugins/codex-coach, and the skill must call codex-coach coach --json and render only from CLI results. The skill should render the three required sections, explain fallback/source labels, and never infer recommendations outside the structured CLI payload.

Before finishing, verify:
- Manifest paths are relative to the plugin root and use ./ prefixes.
- Marketplace entry points at ./plugins/codex-coach.
- Skill references only stable CLI commands from docs/technical-requirements.md.
- Skill instructs Codex to render What's new, Capability map, and Recent work review.
```

#### WS2 CLI Storage and Core Commands

```text
You are working in /Users/xray/software/Codex-Coach-cli-storage on branch codex/ws-cli-storage.

Implement WS2 from docs/implementation-plan.md: CLI Storage and Core Commands.

Own:
- plugins/codex-coach/src/storage/**
- plugins/codex-coach/src/commands/status.ts
- plugins/codex-coach/src/commands/reset-demo-state.ts
- plugins/codex-coach/src/commands/delete-local-history.ts
- shared tests under plugins/codex-coach/src/storage/**/*.test.ts

Use SQLite local persistence. Implement a plugin-owned data directory resolver, schema migrations for all required entities, repository methods, status counts, reset_demo_state skeleton hooks for other streams to seed records, and delete_local_history safety. Preserve the shared JSON envelope contract and do not delete or mutate inspected repos.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach status --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach delete_local_history --json --data-dir /tmp/codex-coach-test
```

#### WS3 Changelog Import and What's New

```text
You are working in /Users/xray/software/Codex-Coach-updates on branch codex/ws-updates.

Implement WS3 from docs/implementation-plan.md: Changelog Import and What's New.

Own:
- plugins/codex-coach/data/codex-updates.json
- plugins/codex-coach/src/updates/**
- plugins/codex-coach/src/commands/import-changelog.ts
- plugins/codex-coach/src/commands/get-updates.ts
- plugins/codex-coach/src/commands/mark-updates-seen.ts
- update-focused tests

Bundle the four required real Codex changelog entries, validate capability_tags against taxonomy.ts, import from bundled JSON offline by default, filter updates by last_seen_updates_at, implement recent_highlights for new users, and mark updates seen. Never invent fake product updates. Optional refresh mode may exist only if it falls back to the bundled cache with warnings.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach import_changelog --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach get_updates --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach mark_updates_seen --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach get_updates --json --data-dir /tmp/codex-coach-test
```

#### WS4 Capability Map and Event Aggregation

```text
You are working in /Users/xray/software/Codex-Coach-capabilities on branch codex/ws-capabilities.

Implement WS4 from docs/implementation-plan.md: Capability Map and Event Aggregation.

Own:
- plugins/codex-coach/src/capabilities/** except taxonomy.ts unless strictly additive and coordinated
- plugins/codex-coach/src/commands/get-capability-map.ts
- capability-map tests

Return every taxonomy capability exactly once, grouped per spec, with status used_recently, tried_before_not_recent, not_observed, or unknown_or_not_connected. Aggregate stored CapabilityEvent records, include source and confidence summaries, label hook-derived data as best-effort, and keep not_observed distinct from unknown_or_not_connected.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach get_capability_map --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach get_capability_map --json --demo --data-dir /tmp/codex-coach-test
```

#### WS5 Git Recent Work Importer

```text
You are working in /Users/xray/software/Codex-Coach-git-importer on branch codex/ws-git-importer.

Implement WS5 from docs/implementation-plan.md: Git Recent Work Importer.

Own:
- plugins/codex-coach/src/importers/git/**
- plugins/codex-coach/src/work-items/**
- plugins/codex-coach/src/commands/get-recent-work.ts
- git importer tests and fixtures

Use git metadata only: commits, branches, filenames, diff stats, timestamps, branch names, and commit messages. Do not read source file contents. Support --repo validation, current repo default, sparse history detection, work item creation with signals, and --demo fallback work items with source: demo-fallback for the required settings-layout and auth/billing-refactor demo items.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach get_recent_work --json --repo . --data-dir /tmp/codex-coach-test
- ./bin/codex-coach get_recent_work --json --repo . --demo --data-dir /tmp/codex-coach-test
```

#### WS6 Hook Capture

```text
You are working in /Users/xray/software/Codex-Coach-hooks on branch codex/ws-hooks.

Implement WS6 from docs/implementation-plan.md: Hook Capture.

Own:
- plugins/codex-coach/hooks/hooks.json
- plugins/codex-coach/src/hooks/**
- plugins/codex-coach/src/commands/record-hook-observation.ts
- hook fixtures and tests

Provide bundled PostToolUse and Stop hook config. Read hook JSON from stdin, persist only allowed metadata, derive capability events where supported, stay quiet without --json, and never store raw prompts, raw source contents, or full tool responses. Stop handlers must never write plain text to stdout.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- printf '%s\n' '{"session_id":"s1","turn_id":"t1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}' | ./bin/codex-coach record_hook_observation --json --data-dir /tmp/codex-coach-test
- printf '%s\n' '{"session_id":"s1","turn_id":"t2","hook_event_name":"Stop","cwd":".","stop_hook_active":false}' | ./bin/codex-coach record_hook_observation --json --data-dir /tmp/codex-coach-test
```

#### WS7 Recommendation Engine and Feedback

```text
You are working in /Users/xray/software/Codex-Coach-recommender on branch codex/ws-recommender.

Implement WS7 from docs/implementation-plan.md: Recommendation Engine and Feedback.

Own:
- plugins/codex-coach/src/recommender/**
- plugins/codex-coach/src/commands/get-recommendations.ts
- plugins/codex-coach/src/commands/mark-recommendation-feedback.ts
- recommender tests and fixtures

Implement deterministic rules only, with no OpenAI API call. Map work item signals to capability IDs, return at most two recommendations per work item, suppress recently used capabilities when appropriate, persist recommendations, and persist useful/not-useful feedback. Ensure the settings layout demo item recommends computer-use or multimodal-input and the auth/billing refactor demo item recommends parallel-agents or cloud-task.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach get_recommendations --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach mark_recommendation_feedback --json --data-dir /tmp/codex-coach-test --recommendation-id <id> --rating useful
```

#### WS8 Coach Aggregator

Start this after WS3, WS4, WS5, and WS7 have stable service APIs.

```text
You are working in /Users/xray/software/Codex-Coach-coach-aggregator on branch codex/ws-coach-aggregator.

Implement WS8 from docs/implementation-plan.md: Coach Aggregator.

Own:
- plugins/codex-coach/src/commands/coach.ts
- aggregate command tests

Compose updates, capability map, recent work, recommendations, and profile into the default coach payload. Propagate warnings from subcommands, aggregate and deduplicate sources, preserve arrays even when empty, and keep output free of raw source contents, raw prompts, and raw log bodies. Do not duplicate business logic from feature streams.

Before finishing, run:
- cd plugins/codex-coach
- npm run typecheck
- ./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
- ./bin/codex-coach coach --json --repo . --demo --data-dir /tmp/codex-coach-test
```

#### WS9 README, Demo Script, and Verification Harness

```text
You are working in /Users/xray/software/Codex-Coach-docs-demo on branch codex/ws-docs-demo.

Implement WS9 from docs/implementation-plan.md: README, Demo Script, and Verification Harness.

Own:
- README.md
- docs/demo-script.md
- optional plugins/codex-coach/scripts/verify-demo.*
- optional plugins/codex-coach/test/fixtures/** if coordinated with owners

Write docs that a fresh tester can follow without reading the technical requirements. Cover what Codex Coach does, what data stays local, plugin installation from repo-local marketplace, Codex app invocation, CLI /plugins fallback, hook enablement, hook verification, command reference, --repo behavior, changelog cache behavior, demo fallback labeling, demo reset, local history deletion, and troubleshooting. Do not change CLI behavior unless coordinating with the owning stream.

Before finishing, verify:
- README covers all required sections in docs/implementation-plan.md.
- docs/demo-script.md includes the exact required demo moments.
- Hook docs mention [features] codex_hooks = true where needed.
- Hook verification uses stored observations, not only SessionStart UI output.
```

## 3. Shared Contracts

The foundation branch should define these contracts before broad parallel work starts.

### CLI Shape

Binary:

```text
plugins/codex-coach/bin/codex-coach
```

Entrypoint:

```text
plugins/codex-coach/src/cli.ts
```

Global options:

- `--repo <path>`
- `--json`
- `--data-dir <path>`
- `--demo`

Required command modules should export a common registration function:

```ts
export function registerXCommands(program: Command): void;
```

### JSON Envelope

Every `--json` response must use the same envelope:

```ts
type JsonSuccess<T> = {
  ok: true;
  command: string;
  generated_at: string;
  data: T;
  warnings: string[];
  sources: SourceRef[];
};

type JsonFailure = {
  ok: false;
  command: string;
  generated_at: string;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};
```

### Canonical Taxonomy

Define capability IDs once, then import them everywhere:

- `cli-local-chat`
- `codex-app-session`
- `cloud-task`
- `parallel-agents`
- `worktree-flow`
- `skills`
- `automations`
- `hooks`
- `plugins`
- `mcp`
- `git-workflow`
- `computer-use`
- `multimodal-input`
- `github-code-review`
- `ide-extension`
- `voice-or-mobile`

### Storage Boundary

All persistent state must go through a storage service. Do not write SQLite files directly from feature modules.

Suggested modules:

```text
plugins/codex-coach/src/storage/
  index.ts
  paths.ts
  migrations.ts
  repositories.ts
```

### Privacy Boundary

No workstream should read source file contents, raw prompts, raw logs, or full tool responses by default. Importers may read metadata only unless a future explicit approval path is added.

## 4. Workstreams

### WS0: Foundation and Integration Skeleton

Branch:

```text
codex/ws-foundation
```

Primary owner:

- Integration lead

File ownership:

- `.gitignore`
- `plugins/codex-coach/package.json`
- `plugins/codex-coach/tsconfig.json`
- `plugins/codex-coach/bin/codex-coach`
- `plugins/codex-coach/src/cli.ts`
- `plugins/codex-coach/src/commands/index.ts`
- `plugins/codex-coach/src/lib/json.ts`
- `plugins/codex-coach/src/lib/errors.ts`
- `plugins/codex-coach/src/lib/time.ts`
- `plugins/codex-coach/src/capabilities/taxonomy.ts`
- `plugins/codex-coach/src/types/*.ts`
- placeholder command modules

Deliverables:

- TypeScript project skeleton.
- Executable `codex-coach` binary.
- Command registry with placeholder implementations for every required command.
- Shared JSON envelope helpers.
- Shared capability taxonomy constants.
- Shared source label constants.
- Global option parsing.
- Minimal `status --json` and `coach --json` placeholder output.
- Scripts for `typecheck`, `test`, and `build` or equivalent.

Acceptance checks:

```sh
cd plugins/codex-coach
npm install
npm run typecheck
./bin/codex-coach status --json
./bin/codex-coach coach --json
```

Notes:

- Keep this branch intentionally thin. The goal is to unblock all other streams with stable contracts, not to implement product behavior.
- If a later stream needs a new dependency, it should either coordinate with this owner or add the dependency in its own branch with a short note in the PR.

### WS1: Plugin Install Surface and Skill

Branch:

```text
codex/ws-plugin-surface
```

File ownership:

- `plugins/codex-coach/.codex-plugin/plugin.json`
- `plugins/codex-coach/skills/coach/SKILL.md`
- `.agents/plugins/marketplace.json`
- optional `plugins/codex-coach/assets/icon.png`

Deliverables:

- Plugin manifest with relative `./` paths.
- Repo-local marketplace entry pointing to `./plugins/codex-coach`.
- Coach skill that tells Codex when to run, how to call `codex-coach coach --json`, and how to render the output.
- Skill instructions for update source URLs, capability statuses, fallback labeling, feedback, reset, and deletion.

Acceptance checks:

- Manifest paths are relative to the plugin root and use `./` prefixes.
- Marketplace entry points at `./plugins/codex-coach`.
- Skill references only stable CLI commands from the technical requirements.
- Skill instructs Codex to render the three required sections.
- Skill never asks Codex to infer recommendations outside the CLI results.

Parallel dependencies:

- Can begin after WS0 defines command names and expected output shape.
- Does not need storage or importer implementation to start.

### WS2: CLI Storage and Core Commands

Branch:

```text
codex/ws-cli-storage
```

File ownership:

- `plugins/codex-coach/src/storage/**`
- `plugins/codex-coach/src/commands/status.ts`
- `plugins/codex-coach/src/commands/reset-demo-state.ts`
- `plugins/codex-coach/src/commands/delete-local-history.ts`
- shared tests under `plugins/codex-coach/src/storage/**/*.test.ts`

Deliverables:

- SQLite dependency and storage adapter.
- Plugin-owned data directory resolver.
- Schema migrations for:
  - `LocalProfile`
  - `CodexUpdate`
  - `CapabilityEvent`
  - `HookObservation`
  - `WorkItem`
  - `Recommendation`
  - `RecommendationFeedback`
- Repository methods for all required entities.
- `status` command with data directory, profile state, hook hints, last update timestamp, and counts.
- `reset_demo_state` command skeleton with hooks for other streams to seed updates, capability events, and work items.
- `delete_local_history` limited to plugin-owned local state.

Acceptance checks:

```sh
./bin/codex-coach status --json --data-dir /tmp/codex-coach-test
./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
./bin/codex-coach delete_local_history --json --data-dir /tmp/codex-coach-test
```

Data safety checks:

- `delete_local_history` refuses to operate outside the resolved plugin data directory or explicit `--data-dir`.
- No command deletes the inspected repo.
- Timestamps are ISO 8601.

Parallel dependencies:

- Blocks final versions of WS3, WS4, WS5, WS6, and WS7.
- Those streams can still develop against the repository interface once WS0 has stub types.

### WS3: Changelog Import and What's New

Branch:

```text
codex/ws-updates
```

File ownership:

- `plugins/codex-coach/data/codex-updates.json`
- `plugins/codex-coach/src/updates/**`
- `plugins/codex-coach/src/commands/import-changelog.ts`
- `plugins/codex-coach/src/commands/get-updates.ts`
- `plugins/codex-coach/src/commands/mark-updates-seen.ts`
- update-focused tests

Deliverables:

- Bundled normalized cache with the four required real changelog entries:
  - `2026-04-23`
  - `2026-04-16-app`
  - `2026-04-07`
  - `2026-03-25`
- Validator that rejects unknown canonical capability tags.
- `import_changelog` offline import from bundled JSON by default.
- Optional refresh mode only if time allows, using official Codex changelog sources and falling back to cache with warnings.
- `get_updates` filtering by `last_seen_updates_at`.
- New-user `recent_highlights` behavior.
- `mark_updates_seen`.
- Demo reset behavior that sets `last_seen_updates_at` early enough to show at least three updates.

Acceptance checks:

```sh
./bin/codex-coach import_changelog --json --data-dir /tmp/codex-coach-test
./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
./bin/codex-coach get_updates --json --data-dir /tmp/codex-coach-test
./bin/codex-coach mark_updates_seen --json --data-dir /tmp/codex-coach-test
./bin/codex-coach get_updates --json --data-dir /tmp/codex-coach-test
```

Required result:

- Updates have real source URLs.
- Updates are sorted newest first.
- `capability_tags` contain only canonical IDs.
- Fake product updates are never generated.

Parallel dependencies:

- Needs taxonomy from WS0.
- Needs storage repository from WS2 for final persistence.
- Can develop fixture tests before WS2 lands.

### WS4: Capability Map and Event Aggregation

Branch:

```text
codex/ws-capabilities
```

File ownership:

- `plugins/codex-coach/src/capabilities/**` except `taxonomy.ts` if owned by WS0
- `plugins/codex-coach/src/commands/get-capability-map.ts`
- capability-map tests

Deliverables:

- Capability groups:
  - Pairing surfaces
  - Delegation and parallelism
  - Review and git workflows
  - Context and input modes
  - Automation and reuse
- Status calculation:
  - `used_recently`
  - `tried_before_not_recent`
  - `not_observed`
  - `unknown_or_not_connected`
- Event aggregation from `CapabilityEvent`.
- Source and confidence summaries per capability.
- Demo fallback capability events when `--demo` or `reset_demo_state` allows it.
- `get_capability_map` command.

Acceptance checks:

```sh
./bin/codex-coach get_capability_map --json --data-dir /tmp/codex-coach-test
./bin/codex-coach get_capability_map --json --demo --data-dir /tmp/codex-coach-test
```

Required result:

- All taxonomy capabilities are returned exactly once.
- Each capability has a status even when no events exist.
- Hook-derived data is labeled as best-effort.
- `not_observed` and `unknown_or_not_connected` are distinct.

Parallel dependencies:

- Needs storage from WS2.
- Consumes events produced by WS5 and WS6, but can be built independently against fixtures.

### WS5: Git Recent Work Importer

Branch:

```text
codex/ws-git-importer
```

File ownership:

- `plugins/codex-coach/src/importers/git/**`
- `plugins/codex-coach/src/work-items/**`
- `plugins/codex-coach/src/commands/get-recent-work.ts`
- git importer tests and fixtures

Deliverables:

- `--repo <path>` validation and current repo default.
- Local git metadata importer.
- Recent commit metadata, branch metadata, filenames, and diff stats.
- Work item creation without reading file contents.
- Sparse-history detection.
- Demo fallback work items when history is sparse and `--demo` allows it:
  - `Debugged settings page layout across desktop and mobile`
  - `Large refactor across auth and billing`
- Capability event inference from git metadata where appropriate.
- `get_recent_work` command.

Acceptance checks:

```sh
./bin/codex-coach get_recent_work --json --repo . --data-dir /tmp/codex-coach-test
./bin/codex-coach get_recent_work --json --repo . --demo --data-dir /tmp/codex-coach-test
```

Required result:

- No source contents are read or emitted.
- Work items include source labels, signals, timestamps, and repo path.
- Sparse demo data is labeled `source: demo-fallback`.
- Invalid repo paths produce a non-zero exit with the JSON error envelope.

Parallel dependencies:

- Needs storage from WS2 for final persistence.
- Feeds WS7 recommender but can develop independently with expected signal fixtures.

### WS6: Hook Capture

Branch:

```text
codex/ws-hooks
```

File ownership:

- `plugins/codex-coach/hooks/hooks.json`
- `plugins/codex-coach/src/hooks/**`
- `plugins/codex-coach/src/commands/record-hook-observation.ts`
- hook fixtures and tests

Deliverables:

- Bundled hooks configuration for:
  - `PostToolUse`
  - `Stop`
- Hook command that reads raw hook JSON from stdin.
- Safe parsing of common hook fields:
  - `session_id`
  - `transcript_path`
  - `cwd`
  - `hook_event_name`
  - `model`
- Safe parsing of `PostToolUse` fields:
  - `turn_id`
  - `tool_name`
  - `tool_use_id`
  - selected metadata from `tool_input`
  - selected metadata from `tool_response`
- Safe parsing of `Stop` fields:
  - `turn_id`
  - `stop_hook_active`
  - metadata derived from `last_assistant_message` without storing raw text by default
- Tool and lifecycle mappings to capability tags.
- Stored `HookObservation` records.
- Derived `CapabilityEvent` records.

Acceptance checks:

```sh
printf '%s\n' '{"session_id":"s1","turn_id":"t1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}' \
  | ./bin/codex-coach record_hook_observation --json --data-dir /tmp/codex-coach-test

printf '%s\n' '{"session_id":"s1","turn_id":"t2","hook_event_name":"Stop","cwd":".","stop_hook_active":false}' \
  | ./bin/codex-coach record_hook_observation --json --data-dir /tmp/codex-coach-test
```

Required result:

- Hook handlers exit `0` for valid payloads.
- Hook handlers are quiet by default when not run with `--json`.
- `Stop` handlers never write plain text to stdout.
- Full tool responses, raw prompts, and source contents are not persisted.

Parallel dependencies:

- Needs storage from WS2.
- Feeds WS4 capability aggregation but can develop independently using test fixtures.

### WS7: Recommendation Engine and Feedback

Branch:

```text
codex/ws-recommender
```

File ownership:

- `plugins/codex-coach/src/recommender/**`
- `plugins/codex-coach/src/commands/get-recommendations.ts`
- `plugins/codex-coach/src/commands/mark-recommendation-feedback.ts`
- recommender tests and fixtures

Deliverables:

- Deterministic rules engine.
- Signal schema for work items.
- Rules for:
  - many files changed, multiple areas, or large diff -> `parallel-agents` or `cloud-task`
  - branch/worktree juggling -> `worktree-flow`
  - PR/review-related work -> `github-code-review`
  - repeated setup/release/maintenance -> `automations` or `skills`
  - UI/browser/debug/responsive/layout terms -> `computer-use`
  - screenshot/image/visual/design terms -> `multimodal-input`
  - commit/branch/diff/rebase/merge-heavy work -> `git-workflow`
  - plugin/MCP/reusable workflow work -> `skills`, `plugins`, or `mcp`
- Recent capability suppression when appropriate.
- Deterministic ranking.
- Maximum two recommendations per work item.
- Recommendation persistence.
- Feedback persistence with useful/not-useful rating and optional note.
- `get_recommendations` command.
- `mark_recommendation_feedback` command.

Acceptance checks:

```sh
./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
./bin/codex-coach get_recommendations --json --data-dir /tmp/codex-coach-test
./bin/codex-coach mark_recommendation_feedback --json --data-dir /tmp/codex-coach-test --recommendation-id <id> --rating useful
```

Required result:

- `Debugged settings page layout across desktop and mobile` gets `computer-use` or `multimodal-input`.
- `Large refactor across auth and billing` gets `parallel-agents` or `cloud-task`.
- Every recommendation has a capability, message, reason, status, and work item source.
- Recommendations are derived from rules, not API calls.

Parallel dependencies:

- Needs WS5 work item signals for final integration.
- Needs WS4 recent capability status for suppression.
- Can develop early against fixtures.

### WS8: Coach Aggregator

Branch:

```text
codex/ws-coach-aggregator
```

File ownership:

- `plugins/codex-coach/src/commands/coach.ts`
- aggregate command tests

Deliverables:

- `coach` command that composes:
  - updates
  - capability map
  - recent work
  - recommendations
  - profile
- Warnings propagated from subcommands.
- Sources aggregated and deduplicated.
- Default behavior suitable for the skill.
- Optional behavior to mark updates seen only when explicitly requested, if the team wants invocation and seen-state mutation to stay separate.

Acceptance checks:

```sh
./bin/codex-coach reset_demo_state --json --data-dir /tmp/codex-coach-test
./bin/codex-coach coach --json --repo . --demo --data-dir /tmp/codex-coach-test
```

Required result:

- `data.updates`, `data.capability_map`, `data.recent_work`, `data.recommendations`, and `data.profile` are present.
- Arrays are present even when empty.
- Output contains no raw source contents, raw prompts, or raw log bodies.

Parallel dependencies:

- Start after WS3, WS4, WS5, and WS7 have stable service APIs.
- This can be handled by the integration lead if staffing is tight.

### WS9: README, Demo Script, and Verification Harness

Branch:

```text
codex/ws-docs-demo
```

File ownership:

- `README.md`
- `docs/demo-script.md`
- optional `plugins/codex-coach/scripts/verify-demo.*`
- optional `plugins/codex-coach/test/fixtures/**` if coordinated with owners

Deliverables:

- Root README covering:
  - what Codex Coach does
  - what data stays local
  - plugin installation from repo-local marketplace
  - invocation from Codex app
  - CLI `/plugins` fallback
  - hook enablement
  - hook verification
  - CLI command reference
  - `--repo <path>` behavior
  - changelog import/cache behavior
  - demo fallback labeling
  - demo reset
  - local history deletion
  - troubleshooting
- Hackathon demo script with happy path and CLI fallback.
- Optional verification script that runs the key CLI commands against a temporary data directory.

Acceptance checks:

- A fresh tester can follow the README without reading the technical requirements.
- Demo script includes the exact required demo moments.
- README documents that hooks may require:

```toml
[features]
codex_hooks = true
```

- README explains that SessionStart UI timing is not the source of truth for hook verification.

Parallel dependencies:

- Can begin early from the specs.
- Should do a final pass after command flags and outputs stabilize.

## 5. Suggested Parallel Execution Plan

### Round 0: Foundation

Run first:

- WS0 Foundation and Integration Skeleton

Exit criteria:

- `codex-coach status --json` works.
- Placeholder `coach --json` works.
- Shared taxonomy and JSON envelope exist.

### Round 1: Independent Feature Build

Run in parallel after WS0 lands:

- WS1 Plugin Install Surface and Skill
- WS2 CLI Storage and Core Commands
- WS3 Changelog Import and What's New
- WS4 Capability Map and Event Aggregation
- WS5 Git Recent Work Importer
- WS6 Hook Capture
- WS7 Recommendation Engine and Feedback
- WS9 README, Demo Script, and Verification Harness

Suggested staffing:

| Thread | Workstream | Why it can run independently |
| --- | --- | --- |
| Thread A | WS1 | Mostly manifest and skill markdown |
| Thread B | WS2 | Owns storage and core command mechanics |
| Thread C | WS3 | Owns bundled update data and update commands |
| Thread D | WS4 | Owns taxonomy grouping and capability statuses |
| Thread E | WS5 | Owns git metadata import and work items |
| Thread F | WS6 | Owns hooks config and hook command |
| Thread G | WS7 | Owns rules and feedback |
| Thread H | WS9 | Owns docs and demo script |

### Round 2: Aggregation and Contract Tightening

Run after the service APIs stabilize:

- WS8 Coach Aggregator
- Final pass on WS1 skill instructions
- Final pass on WS9 README and demo script

Exit criteria:

- `coach --json` returns the full required payload.
- Skill can render from the aggregate command without calling lower-level commands manually.

### Round 3: Integration and Demo Rehearsal

Run as a single integration thread:

- Merge all workstreams.
- Resolve command registration and package dependency conflicts.
- Run full acceptance matrix.
- Rehearse happy path in Codex app.
- Rehearse CLI `/plugins` fallback.
- Confirm reset and deletion behavior.

## 6. Merge Order

Recommended merge order:

1. `codex/ws-foundation`
2. `codex/ws-cli-storage`
3. `codex/ws-updates`
4. `codex/ws-capabilities`
5. `codex/ws-git-importer`
6. `codex/ws-hooks`
7. `codex/ws-recommender`
8. `codex/ws-coach-aggregator`
9. `codex/ws-plugin-surface`
10. `codex/ws-docs-demo`

Reasoning:

- Storage should land before modules that persist records.
- Updates and capability map are the fastest path to a convincing `coach` payload.
- Git importer and hooks add real local signal quality.
- Recommender should merge after work item signals are stable.
- Skill and docs should get a final pass after CLI behavior stops changing.

## 7. Conflict Avoidance Rules

1. Do not edit another workstream's owned files without coordinating.
2. Add new command modules in separate files; only the integration lead should edit central registration if possible.
3. Keep shared types additive. Avoid renaming fields after Round 1 begins.
4. If a workstream needs a README change before WS9 is ready, add notes to `docs/integration-notes/<workstream>.md` instead of editing `README.md`.
5. If a workstream needs a dependency, add it in its branch and call it out in the PR summary.
6. Do not duplicate business logic across CLI, hooks, skill markdown, and optional MCP wrappers.
7. Use fixtures for tests rather than relying on the developer's local history.
8. Never add generated SQLite files, local demo data, `node_modules`, or build output to git.

## 8. Cross-Stream Interfaces

### Updates Interface

Provided by WS3:

```ts
getUpdates(ctx): Promise<GetUpdatesData>
importChangelog(ctx): Promise<ImportChangelogData>
markUpdatesSeen(ctx, timestamp?): Promise<Profile>
```

Consumed by:

- WS8 coach aggregator
- WS1 skill indirectly through `coach --json`
- WS9 README examples

### Capability Interface

Provided by WS4:

```ts
getCapabilityMap(ctx): Promise<GetCapabilityMapData>
recordCapabilityEvents(ctx, events): Promise<void>
```

Consumed by:

- WS6 hook capture
- WS7 recommender suppression
- WS8 coach aggregator

### Work Item Interface

Provided by WS5:

```ts
getRecentWork(ctx): Promise<GetRecentWorkData>
upsertWorkItems(ctx, items): Promise<void>
```

Consumed by:

- WS7 recommender
- WS8 coach aggregator

### Recommendation Interface

Provided by WS7:

```ts
getRecommendations(ctx): Promise<GetRecommendationsData>
markRecommendationFeedback(ctx, input): Promise<FeedbackData>
```

Consumed by:

- WS8 coach aggregator
- WS1 skill feedback instructions
- WS9 demo script

### Hook Interface

Provided by WS6:

```ts
recordHookObservation(ctx, rawHookPayload): Promise<RecordHookObservationData>
```

Consumed by:

- `hooks/hooks.json`
- WS4 capability aggregation through stored events

## 9. Integration Checkpoints

### Checkpoint 1: Installable Skeleton

Required branches:

- WS0
- WS1

Commands:

```sh
cd plugins/codex-coach
npm install
npm run typecheck
./bin/codex-coach coach --json
```

Manual checks:

- Plugin manifest is present.
- Marketplace entry points to the plugin.
- Skill references the binary and expected command.

### Checkpoint 2: Demo Data Pipeline

Required branches:

- WS2
- WS3
- WS4
- WS5 demo fallback path
- WS7 demo rules

Commands:

```sh
./plugins/codex-coach/bin/codex-coach reset_demo_state --json --demo --data-dir /tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach get_updates --json --demo --data-dir /tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach get_capability_map --json --demo --data-dir /tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach get_recent_work --json --demo --data-dir /tmp/codex-coach-demo
./plugins/codex-coach/bin/codex-coach get_recommendations --json --demo --data-dir /tmp/codex-coach-demo
```

Required results:

- At least three updates appear after reset.
- All update URLs are real changelog URLs.
- At least one capability is `not_observed`.
- Both demo work items appear.
- Required recommendations appear.

### Checkpoint 3: Real Local Signals

Required branches:

- WS5
- WS6
- WS4 integration

Commands:

```sh
./plugins/codex-coach/bin/codex-coach get_recent_work --json --repo . --data-dir /tmp/codex-coach-real
printf '%s\n' '{"session_id":"s1","turn_id":"t1","hook_event_name":"PostToolUse","tool_name":"apply_patch","cwd":"."}' \
  | ./plugins/codex-coach/bin/codex-coach record_hook_observation --json --data-dir /tmp/codex-coach-real
./plugins/codex-coach/bin/codex-coach get_capability_map --json --data-dir /tmp/codex-coach-real
```

Required results:

- Git importer works in this repo.
- Hook observation command stores a record.
- Derived capability event appears in capability map.
- Output remains metadata-only.

### Checkpoint 4: Full Coach Payload

Required branches:

- WS8
- All feature branches

Command:

```sh
./plugins/codex-coach/bin/codex-coach coach --json --repo . --demo --data-dir /tmp/codex-coach-full
```

Required results:

- Top-level envelope is valid.
- `data.profile` is present.
- `data.updates` is present.
- `data.capability_map` is present.
- `data.recent_work` is present.
- `data.recommendations` is present.
- `warnings` and `sources` arrays are present.

### Checkpoint 5: Demo Rehearsal

Manual flow:

1. Install plugin from repo-local marketplace in Codex app.
2. Start new Codex thread.
3. Invoke Codex Coach.
4. Confirm three-section readout.
5. Confirm update URLs are visible.
6. Confirm capability map has at least one not-observed capability.
7. Confirm both required demo work items.
8. Mark one recommendation useful.
9. Run `delete_local_history`.
10. Repeat reset and invocation.

Fallback flow:

- Use Codex CLI `/plugins` to install and invoke if the app plugin directory is unavailable.

## 10. Testing Plan

Minimum automated checks:

- Typecheck.
- Command envelope tests for each `--json` command.
- Changelog fixture validation.
- Capability taxonomy validation.
- Storage migration test.
- Delete-local-history safety test.
- Git importer fixture test.
- Hook `PostToolUse` fixture test.
- Hook `Stop` fixture test.
- Demo recommender fixture test.
- Full `coach --json` snapshot or schema test.

Manual checks:

- Plugin appears in the install surface.
- Skill invocation can call the binary.
- Hook enablement instructions work.
- Hook verification uses stored observation, not only UI startup text.
- README gets a fresh tester through install, reset, run, feedback, and delete.

## 11. Risk Register

| Risk | Owner | Mitigation |
| --- | --- | --- |
| Workstreams conflict in package metadata | WS0 | Land foundation first; keep dependency changes explicit |
| SQLite dependency setup burns time | WS2 | Use a simple, well-supported Node SQLite package; keep schema small |
| Plugin install surface changes | WS1 | Keep manifest minimal and verify early |
| Changelog refresh is unreliable | WS3 | Bundle required real entries; make network refresh optional |
| Sparse git history weakens demo | WS5 | Use `--demo` fallback records with `source: demo-fallback` |
| Hooks disabled in tester environment | WS6 | Make hooks additive; document feature flag and verification |
| Recommendations feel vague | WS7 | Tie every recommendation to concrete signals and work item title |
| Skill output drifts from CLI truth | WS1/WS8 | Skill renders structured CLI results; rules stay in CLI |
| Privacy concern from local inspection | All | Read metadata only by default; expose source labels |
| Demo reset mutates too much | WS2/WS3/WS5/WS7 | Reset only plugin-owned local state |

## 12. Hackathon Build Priorities

If time is tight, protect these paths first:

1. WS0 foundation.
2. WS1 install surface and skill.
3. WS2 storage, reset, deletion, and status.
4. WS3 bundled changelog updates.
5. WS5 demo work item fallback.
6. WS7 demo recommendations.
7. WS8 aggregate `coach --json`.
8. WS9 README and demo script.

Then add:

1. Real git importer quality.
2. Hook capture.
3. Rich capability event aggregation.
4. Optional changelog refresh.
5. Additional tests and polish.

This prioritization still satisfies the demo-critical path while preserving the local-first and privacy requirements.

## 13. Definition of Done

The implementation is done when:

- `codex-coach coach --json --demo` returns a complete payload from a clean data directory.
- `reset_demo_state` creates a reliable demo state.
- `get_updates` returns real bundled changelog entries with source URLs.
- `get_capability_map` returns every canonical capability with a status.
- `get_recent_work` returns real git work where available and labeled fallback records in demo mode.
- `get_recommendations` returns deterministic recommendations for the two required demo work items.
- `mark_recommendation_feedback` persists a useful/not-useful rating.
- `record_hook_observation` handles representative `PostToolUse` and `Stop` JSON payloads.
- `delete_local_history` removes only plugin-owned data.
- The plugin can be installed from `.agents/plugins/marketplace.json`.
- The skill can be invoked from Codex and renders the three required sections.
- README instructions are sufficient for a fresh local tester.
- No MVP command requires network access, source content inspection, or external API calls.
