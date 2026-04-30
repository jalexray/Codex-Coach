# Codex Coach Technical Requirements

Last updated: April 30, 2026

Source: `docs/hackathon-spec.md`

## 1. Purpose

Codex Coach is a local-first Codex plugin that helps a developer notice and adopt higher-leverage Codex workflows. For the hackathon demo, the plugin must install inside Codex, run from a Codex thread, and produce a concise coaching readout based on real local metadata where possible.

The demo output must include:

1. Codex updates shipped since the user's previous Codex Coach invocation.
2. A capability usage map showing observed, stale, unobserved, and unknown Codex workflows.
3. Recent work items with deterministic recommendations for Codex features to try next time.
4. Feedback, demo reset, and local history deletion flows.

## 2. MVP Product Requirements

### 2.1 Plugin Packaging

Codex Coach must be delivered as an installable Codex plugin, not as a standalone app.

Required:

- Provide a plugin root at `plugins/codex-coach/`.
- Include `.codex-plugin/plugin.json` with plugin metadata and relative `./` paths.
- Include `skills/coach/SKILL.md` as the primary user-facing workflow.
- Include repo-local marketplace metadata at `.agents/plugins/marketplace.json`.
- Include a CLI command layer that the skill and hooks can call.
- Include bundled hooks configuration at `hooks/hooks.json`.
- Include README setup and troubleshooting documentation.

Optional for MVP:

- Include `plugins/codex-coach/.mcp.json` only if it wraps the same CLI command layer without duplicating logic.
- Include `assets/icon.png` or screenshots for the plugin install surface.

### 2.2 Invocation Experience

The primary experience is Codex thread output in the Codex app or CLI.

Required:

- Support invocation through the bundled skill or `@Codex Coach`.
- Support prompts equivalent to:
  - "Use Codex Coach to show what's new."
  - "Use Codex Coach to review my recent work."
- Return structured local results that Codex can phrase into a friendly thread response.
- Render three sections in the default coaching readout:
  - What's new
  - Capability map
  - Recent work review

### 2.3 Local-First Privacy

Required:

- Store all plugin state locally.
- Do not send source code, prompts, logs, or raw work history off-machine by default.
- Do not inspect file contents by default.
- Use git metadata, filenames, diff stats, branch names, commit messages, timestamps, hook events, and user-provided summaries.
- Make every imported source explainable in output or debug commands.
- Label generated demo data with `source: demo-fallback`.
- Label hook data as best-effort local observations.
- Provide `delete_local_history`.
- Provide `reset_demo_state`.

## 3. Core Functional Requirements

### 3.1 New Feature Overview

Goal: show real Codex product updates since the user's last Codex Coach invocation.

Required behavior:

- Persist `last_seen_updates_at` locally.
- Maintain a normalized local cache of real Codex changelog entries.
- Filter updates where `published_at > last_seen_updates_at`.
- Sort newest updates first.
- For a new user, show compact recent highlights.
- For the hackathon demo, support resetting `last_seen_updates_at` to spoof an earlier visit.
- Each displayed update must include:
  - Date
  - Title
  - Short summary
  - Source URL
  - One or more canonical capability tags from Section 3.2
  - Optional update topic tags for changelog-specific concepts that are not trackable user capabilities
  - Practical "when to use it" framing

Capability tag policy:

- `capability_tags` must contain only canonical capability IDs from Section 3.2.
- `update_topic_tags` may contain changelog-specific topics such as `model-workflow-discovery`, `automatic-approval-reviews`, `product-discovery-updates`, or `plugin-installation`.
- Every update must map to at least one canonical capability tag, even when it also has topic tags.

Required demo changelog entries:

| ID | Date | Canonical capability tags | Update topic tags | Source |
| --- | --- | --- | --- | --- |
| `2026-04-23` | 2026-04-23 | `computer-use`, `hooks`, `codex-app-session`, `github-code-review` | `model-workflow-discovery`, `automatic-approval-reviews` | `https://developers.openai.com/codex/changelog#codex-2026-04-23` |
| `2026-04-16-app` | 2026-04-16 | `computer-use`, `multimodal-input`, `codex-app-session` | `richer-app-workflows` | `https://developers.openai.com/codex/changelog#codex-2026-04-16-app` |
| `2026-04-07` | 2026-04-07 | `cli-local-chat`, `codex-app-session` | `model-workflow-discovery`, `product-discovery-updates` | `https://developers.openai.com/codex/changelog#codex-2026-04-07` |
| `2026-03-25` | 2026-03-25 | `skills`, `plugins`, `mcp`, `cli-local-chat`, `codex-app-session`, `ide-extension` | `plugin-installation` | `https://developers.openai.com/codex/changelog#codex-2026-03-25` |

Changelog import policy:

- `plugins/codex-coach/data/codex-updates.json` must bundle the four required real changelog entries so the demo never depends on network access.
- `import_changelog` must import and validate bundled entries by default.
- `import_changelog` may support an explicit refresh mode for fetching newer official Codex changelog entries, but the MVP demo must work without refresh.
- Refreshed entries must come from official Codex changelog URLs, preserve their source URL or anchor, and be normalized into the same `CodexUpdate` schema.
- If refresh fails or network access is unavailable, the command must fall back to the local cache and return a warning instead of inventing updates.
- Fake product updates are not allowed. Demo fallback records may exist for capability events or work items only, never for changelog updates.

Acceptance criteria:

- Returning users see only updates newer than the previous invocation.
- New users see recent highlights.
- At least one update delta appears in the demo after `reset_demo_state`.
- Every update links to a real changelog source.
- Every update's `capability_tags` values validate against the canonical taxonomy.

### 3.2 Capability Usage Tracking

Goal: show which Codex capabilities have been used, tried before, not observed, or cannot be assessed.

Required capability event fields:

- `id`
- `user_id`
- `capability`
- `source`
- `occurred_at`
- `confidence`
- `metadata`

Required capability groups:

- Pairing surfaces
- Delegation and parallelism
- Review and git workflows
- Context and input modes
- Automation and reuse

Required capability taxonomy:

| Capability | Description |
| --- | --- |
| `cli-local-chat` | Local Codex CLI pairing |
| `codex-app-session` | Codex app usage |
| `cloud-task` | Delegated app or cloud-backed task |
| `parallel-agents` | Multiple agents working in parallel |
| `worktree-flow` | Worktree-backed task isolation |
| `skills` | Reusable Codex skills |
| `automations` | Scheduled or triggered Codex workflows |
| `hooks` | Codex hooks setup or use |
| `plugins` | Installing or building Codex plugins |
| `mcp` | Connecting local or remote tools through MCP |
| `git-workflow` | Branch, diff, commit, PR, or merge assistance |
| `computer-use` | Browser or UI interaction |
| `multimodal-input` | Screenshots, diagrams, images, or visual context |
| `github-code-review` | Codex review on GitHub pull requests |
| `ide-extension` | IDE-based pairing |
| `voice-or-mobile` | Future optional mobile or voice workflow |

Required status labels:

- `used_recently`
- `tried_before_not_recent`
- `not_observed`
- `unknown_or_not_connected`

Required local sources:

- Current repo by default.
- Optional `--repo <path>` repository scan.
- Local git metadata.
- Hook observations when hooks are enabled.
- Local Codex-related session or plugin metadata only where available, stable, and explicitly user-approved.
- User-provided summaries or imported local exports/logs only when the user explicitly points Codex Coach at them.
- Demo fallback events only when real signals are sparse.

Acceptance criteria:

- The system can render most-used, least-used, and not-observed capabilities.
- Every observed event is explainable by source.
- Output distinguishes `not_observed` from `unknown_or_not_connected`.
- Hook-captured usage is described as best-effort, not complete telemetry.

### 3.3 Recent Work Review

Goal: summarize recent completed work and recommend zero to two Codex capabilities per work item.

Required work item fields:

- `id`
- `user_id`
- `source`
- `title`
- `summary`
- `completed_at`
- `signals`
- `artifact_url`
- `repo_path`

Required work item sources:

- Local git commits and branches.
- Local unmerged worktrees or recent branches where feasible.
- Codex CLI/session metadata if available, stable, local, and explicitly user-approved.
- Codex app/plugin metadata or event exports if available, stable, local, and explicitly user-approved.
- Hook observations when enabled.
- User-entered work summaries as fallback.
- Local exports or logs only when the user explicitly provides or selects them for import.
- Demo fallback work items only when real local history is sparse.

Consent and inspection rules:

- Recent-work importers must not read source file contents by default.
- Any importer that reads local Codex session metadata, plugin metadata, exports, or logs must require explicit user approval before reading those files.
- User approval must be reflected in command input, README instructions, or an interactive confirmation outside `--json` mode.
- Imported records must store the source label and enough metadata to explain where the record came from without exposing raw prompts or source code.

Required demo work items:

- `Debugged settings page layout across desktop and mobile`
- `Large refactor across auth and billing`

The first item is demo-critical because it must produce a visible `computer-use` or `multimodal-input` recommendation.

Recommendation behavior:

- Use deterministic rules, not a separate OpenAI API call.
- Return structured recommendation IDs and capability IDs.
- Codex may phrase the final user-facing explanation from structured local results.
- Classify work by signals such as files changed, commit count, branch names, file paths, diff stats, labels, test failure hints, and keywords.
- Suppress recommendations for capabilities used recently unless recommending a better pattern.
- Include one-sentence reasoning for every recommendation.
- Produce zero to two recommendations per work item.

Acceptance criteria:

- Every recommendation names a specific Codex capability.
- Every recommendation explains why it applies.
- Users can mark a recommendation useful or not useful.
- Fallback recommendations are clearly tied to `source: demo-fallback` records.

## 4. Data Requirements

### 4.1 Storage

Required:

- Use SQLite for local persistence.
- Store data in a plugin-owned local data directory.
- Make the storage path discoverable through a debug or status command.
- Support destructive local cleanup through `delete_local_history`.
- Support demo replay through `reset_demo_state`.

### 4.2 Tables or Collections

Required entities:

- `LocalProfile`
- `CodexUpdate`
- `CapabilityEvent`
- `HookObservation`
- `WorkItem`
- `Recommendation`
- `RecommendationFeedback`

Minimum fields:

```text
LocalProfile(id, display_name, last_seen_updates_at, created_at)
CodexUpdate(id, published_at, title, summary, source_url, capability_tags, update_topic_tags, imported_at)
CapabilityEvent(id, user_id, capability, source, occurred_at, confidence, metadata)
HookObservation(id, session_id, turn_id, hook_event_name, tool_name, source, observed_at, capability_tags, metadata)
WorkItem(id, user_id, source, title, summary, completed_at, signals, artifact_url, repo_path)
Recommendation(id, user_id, work_item_id, capability, message, reason, status, created_at)
RecommendationFeedback(id, recommendation_id, rating, note, created_at)
```

### 4.3 Source Labeling

Required source labels:

- `git`
- `hook`
- `user-summary`
- `codex-changelog`
- `codex-session`
- `codex-plugin-metadata`
- `local-import`
- `demo-fallback`

## 5. CLI Requirements

The CLI must be the stable local command layer. Command names should be designed so they can become MCP tools later.

Binary:

- `codex-coach`

Required global options:

- `--repo <path>`: repository to inspect; defaults to current working directory.
- `--json`: emit machine-readable JSON for skill and future MCP use.
- `--data-dir <path>`: optional override for development and tests.
- `--demo`: allow seeded demo fallback data when real data is sparse.

Required commands:

| Command | Purpose |
| --- | --- |
| `status` | Show data directory, profile state, hook availability hints, and last update timestamp |
| `get_updates` | Return changelog entries relevant to current `last_seen_updates_at` |
| `mark_updates_seen` | Update `last_seen_updates_at` after a coaching readout |
| `get_capability_map` | Return grouped capability statuses and supporting observations |
| `get_recent_work` | Return recent work items from git, hooks, imports, and fallback records |
| `get_recommendations` | Return recommendations for recent work items |
| `coach` | Return the full default payload for the skill: updates, capability map, work, recommendations |
| `mark_recommendation_feedback` | Store useful/not-useful feedback |
| `import_changelog` | Normalize bundled or fetched Codex changelog entries into local cache |
| `record_hook_observation` | Record a hook event from bundled hooks |
| `reset_demo_state` | Reset demo timestamps and seed deterministic fallback records |
| `delete_local_history` | Delete local plugin history |

Required command behavior:

- All skill-facing commands must support `--json`.
- Commands must exit non-zero with a useful error message on invalid input.
- `coach --json` must be sufficient for `skills/coach/SKILL.md` to render the demo.
- `delete_local_history` must not delete files outside the plugin-owned data directory.

### 5.1 JSON Response Contract

All `--json` command responses must use the same top-level envelope.

Success envelope:

```json
{
  "ok": true,
  "command": "coach",
  "generated_at": "2026-04-30T12:00:00.000Z",
  "data": {},
  "warnings": [],
  "sources": []
}
```

Error envelope:

```json
{
  "ok": false,
  "command": "get_recent_work",
  "generated_at": "2026-04-30T12:00:00.000Z",
  "error": {
    "code": "invalid_repo",
    "message": "Repository path does not exist or is not readable.",
    "details": {}
  }
}
```

Common schema rules:

- All timestamps must be ISO 8601 strings.
- All persisted entity IDs must be stable strings.
- `sources` entries must include `label`, `description`, and optional `path`, `url`, or `record_count`.
- Skill-facing commands must avoid raw source contents, raw prompts, or raw log bodies in JSON output.
- Arrays must be present even when empty so the skill can render predictable output.

Required command `data` shapes:

```text
status:
  data(profile, data_dir, repo, hooks, last_seen_updates_at, counts)
  profile(id, display_name, last_seen_updates_at, created_at)
  hooks(enabled_hint, config_hint, last_observed_at)

get_updates:
  data(last_seen_updates_at, mode, updates[], recent_highlights[], next_mark_seen_at)
  updates[](id, published_at, title, summary, source_url, capability_tags, update_topic_tags, imported_at, when_to_use)

get_capability_map:
  data(summary, groups[])
  groups[](id, label, capabilities[])
  capabilities[](id, label, description, status, event_count, last_observed_at, sources[], confidence)

get_recent_work:
  data(repo, sparse_history, work_items[])
  work_items[](id, source, title, summary, completed_at, signals, artifact_url, repo_path)

get_recommendations:
  data(recommendations[])
  recommendations[](id, work_item_id, capability, message, reason, status, work_item_source)

coach:
  data(updates, capability_map, recent_work, recommendations, profile)

mark_recommendation_feedback:
  data(feedback)
  feedback(id, recommendation_id, rating, note, created_at)

import_changelog:
  data(imported_count, skipped_count, refreshed, cache_path, updates[])

record_hook_observation:
  data(observation_id, derived_capability_event_ids[])

reset_demo_state:
  data(profile, seeded_records, last_seen_updates_at)

delete_local_history:
  data(deleted, data_dir)
```

## 6. Hook Requirements

Required:

- Provide `plugins/codex-coach/hooks/hooks.json`.
- Configure supported lifecycle hooks to call `codex-coach record_hook_observation`.
- Bundled hook handlers should call `record_hook_observation` without `--json` so normal hook execution stays quiet.
- Minimum bundled lifecycle events:
  - `PostToolUse` for best-effort capability capture after supported tool use.
  - `Stop` for a turn-level observation when the assistant turn finishes.
- `PostToolUse` should match supported tool names such as `Bash`, `apply_patch`, and MCP tool names where the current Codex runtime exposes them.
- `Stop` must not rely on matcher filtering because current Codex runtimes do not use matchers for that event.
- Record hook event name, tool name where available, timestamp, inferred capability tags, confidence, and metadata.
- `record_hook_observation` must accept the raw hook JSON object on `stdin` and persist only the allowed metadata fields needed for capability inference.
- Common hook input fields consumed:
  - `session_id`
  - `transcript_path`
  - `cwd`
  - `hook_event_name`
  - `model`
- `PostToolUse` input fields consumed:
  - `turn_id`
  - `tool_name`
  - `tool_use_id`
  - `tool_input`
  - `tool_response`
- `Stop` input fields consumed:
  - `turn_id`
  - `stop_hook_active`
  - `last_assistant_message`
- Hook handlers must exit `0` with no stdout unless they intentionally return valid Codex hook JSON.
- `Stop` handlers must never write plain text to stdout; if they write anything on success, it must be valid JSON.
- Hook handlers must not write raw prompts, raw source contents, or full tool responses into local storage by default.
- Do not depend on the Codex CLI rendering SessionStart messages immediately under the initial banner; the UI may surface the warning/status line after the first interaction.
- Document that users may need to enable:

```toml
[features]
codex_hooks = true
```

Acceptance criteria:

- With hooks enabled, invoking Codex and using supported tools creates local hook observations.
- With hooks disabled, the plugin still works from git metadata and fallback/user-provided data.
- Passing representative `PostToolUse` and `Stop` JSON payloads to `record_hook_observation --json` creates explainable hook observations and derived capability events.
- The README explains how to verify hook observations are being written, using a file or stored observation as the source of truth rather than only visual startup output.

## 7. Recommender Requirements

Required:

- Implement a deterministic rules engine.
- Keep recommendation selection in code, not in the Codex phrasing layer.
- Map work signals to capabilities.
- Return at most two recommendations per work item.
- Suppress stale or irrelevant recommendations.
- Include recommendation status and feedback support.

Minimum rules:

| Signal | Recommendation |
| --- | --- |
| Many files changed, multiple areas, or large diff | `parallel-agents` or `cloud-task` |
| Branch/worktree juggling or multiple attempts | `worktree-flow` |
| PR/review-related work | `github-code-review` |
| Repeated setup, release, or maintenance workflow | `automations` or `skills` |
| UI/browser/debug/responsive/layout terms | `computer-use` |
| Screenshot/image/visual/design terms | `multimodal-input` |
| Commit/branch/diff/rebase/merge-heavy work | `git-workflow` |
| Plugin, MCP, or reusable workflow work | `skills`, `plugins`, or `mcp` |

Demo-required recommendations:

- `Debugged settings page layout across desktop and mobile` recommends `computer-use` or `multimodal-input`.
- `Large refactor across auth and billing` recommends `parallel-agents` or `cloud-task`.

## 8. Documentation Requirements

Add a root `README.md`.

Required README sections:

- What Codex Coach does.
- What data stays local.
- Plugin installation from repo-local marketplace.
- Invocation from Codex app.
- CLI `/plugins` fallback.
- Hook enablement.
- Hook verification, including the known SessionStart UI timing caveat and marker-file or observation-store checks.
- CLI command reference.
- `--repo <path>` behavior.
- Real changelog import and cache behavior.
- Demo fallback labeling.
- Demo reset.
- Local history deletion.
- Troubleshooting:
  - Missing marketplace entries.
  - Disabled hooks.
  - Empty git history.
  - Missing Node dependencies.
  - Local data deletion.

## 9. Demo Requirements

The hackathon demo must be rehearsable and deterministic.

Required happy path:

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

Required fallback path:

- Use Codex CLI `/plugins` for installation and invocation if the Codex app plugin directory is unavailable.

## 10. Acceptance Test Matrix

| Area | Test |
| --- | --- |
| Plugin manifest | Plugin validates with relative paths and appears in local marketplace |
| Skill | Skill can call `codex-coach coach --json` and render the three-section readout |
| Updates | `reset_demo_state` followed by `get_updates --json` returns real changelog entries with URLs |
| Changelog import | Bundled import works offline; optional refresh never invents missing entries |
| Seen timestamp | `mark_updates_seen` suppresses already-seen entries on the next run |
| Capability tags | Every `CodexUpdate.capability_tags` value is present in the canonical taxonomy |
| Capability map | `get_capability_map --json` returns all taxonomy capabilities with statuses |
| JSON schema | Each `--json` command returns the required envelope and command-specific `data` shape |
| Git importer | `get_recent_work --repo <path> --json` returns work from git metadata without reading file contents |
| Consent-gated imports | Session metadata, plugin metadata, exports, and logs are skipped unless explicitly approved |
| Fallback data | Sparse repositories get demo fallback records only when demo mode is enabled |
| Recommender | Demo work items produce the required recommendations |
| Feedback | `mark_recommendation_feedback` persists useful/not-useful state |
| Hooks | Hook command records observations when passed representative `PostToolUse` and `Stop` payloads |
| Privacy | No command requires network access or source content inspection for the MVP demo |
| Deletion | `delete_local_history` removes local plugin data only |
| README | Setup instructions allow a fresh tester to install, invoke, reset, and delete data |

## 11. Build Task Breakdown

### Phase 0: Repository Setup

- [ ] Create `plugins/codex-coach/` plugin root.
- [ ] Create `.agents/plugins/` directory.
- [ ] Choose package manager and TypeScript runtime strategy.
- [ ] Add root `.gitignore` entries for dependencies, build output, SQLite files, and local demo data.
- [ ] Add root or plugin-local package metadata.
- [ ] Add formatting and typecheck scripts.

### Phase 1: Plugin Install Surface

- [ ] Create `plugins/codex-coach/.codex-plugin/plugin.json`.
- [ ] Ensure all manifest paths are relative and use `./` prefixes.
- [ ] Add plugin name, description, version, and skill references.
- [ ] Add optional asset reference if an icon is created.
- [ ] Create `.agents/plugins/marketplace.json`.
- [ ] Point marketplace entry at `./plugins/codex-coach`.
- [ ] Verify the plugin appears in the Codex app plugin directory.
- [ ] Verify CLI `/plugins` fallback can find the repo-local plugin.

### Phase 2: Skill Workflow

- [ ] Create `plugins/codex-coach/skills/coach/SKILL.md`.
- [ ] Define when the skill should run.
- [ ] Instruct Codex to call `codex-coach coach --json`.
- [ ] Define thread output sections and tone.
- [ ] Instruct Codex to cite update source URLs.
- [ ] Instruct Codex to distinguish observed, not observed, and unknown capability statuses.
- [ ] Instruct Codex to avoid blamey language and phrase recommendations as "try next time."
- [ ] Document feedback command usage.

### Phase 3: CLI Foundation

- [ ] Create `plugins/codex-coach/package.json`.
- [ ] Create `plugins/codex-coach/bin/codex-coach`.
- [ ] Create TypeScript source entrypoint.
- [ ] Implement command parsing.
- [ ] Implement global `--json`.
- [ ] Implement global `--repo <path>`.
- [ ] Implement global `--data-dir <path>`.
- [ ] Implement global `--demo`.
- [ ] Implement consistent JSON response envelopes.
- [ ] Implement command-specific JSON `data` shapes from Section 5.1.
- [ ] Implement consistent error handling and non-zero exits.
- [ ] Add `status` command.
- [ ] Add `coach` aggregate command.

### Phase 4: Local Storage

- [ ] Add SQLite dependency or wrapper.
- [ ] Create storage path resolver.
- [ ] Create schema migration mechanism.
- [ ] Implement `LocalProfile` table.
- [ ] Implement `CodexUpdate` table.
- [ ] Implement `CapabilityEvent` table.
- [ ] Implement `HookObservation` table.
- [ ] Implement `WorkItem` table.
- [ ] Implement `Recommendation` table.
- [ ] Implement `RecommendationFeedback` table.
- [ ] Add repository or service methods for each entity.
- [ ] Add safe deletion for plugin-owned local history.

### Phase 5: Changelog Data

- [ ] Create `plugins/codex-coach/data/codex-updates.json`.
- [ ] Add the four required real changelog entries.
- [ ] Include IDs, dates, titles, summaries, source URLs, imported timestamps, canonical capability tags, and update topic tags.
- [ ] Validate that every canonical capability tag exists in Section 3.2.
- [ ] Implement `import_changelog`.
- [ ] Import bundled changelog entries offline by default.
- [ ] If refresh mode is implemented, fetch only official Codex changelog sources and fall back to cache with a warning on failure.
- [ ] Implement `get_updates`.
- [ ] Implement new-user recent highlights behavior.
- [ ] Implement `mark_updates_seen`.
- [ ] Ensure `reset_demo_state` can set `last_seen_updates_at` before required demo updates.

### Phase 6: Capability Taxonomy

- [ ] Define capability constants.
- [ ] Include `plugins` and `mcp` as canonical capabilities.
- [ ] Define capability groups.
- [ ] Define capability display labels and descriptions.
- [ ] Define status calculation thresholds for recent versus stale usage.
- [ ] Implement event aggregation.
- [ ] Implement `get_capability_map`.
- [ ] Add source and confidence details to capability output.
- [ ] Add fallback events with `source: demo-fallback` only in demo mode or reset demo state.

### Phase 7: Git Work Importer

- [ ] Implement current repo detection.
- [ ] Implement `--repo <path>` validation.
- [ ] Read recent commit metadata.
- [ ] Read branch metadata.
- [ ] Read file names and diff stats.
- [ ] Avoid reading file contents.
- [ ] Require explicit approval before reading local Codex session metadata, plugin metadata, exports, or logs.
- [ ] Convert git signals into `WorkItem` records.
- [ ] Infer capability events from git activity where appropriate.
- [ ] Implement sparse-history detection.
- [ ] Add demo fallback work items when history is sparse and demo mode allows it.
- [ ] Implement `get_recent_work`.

### Phase 8: Hook Capture

- [ ] Create `plugins/codex-coach/hooks/hooks.json`.
- [ ] Define `PostToolUse` and `Stop` lifecycle handlers.
- [ ] Call `codex-coach record_hook_observation` from hooks.
- [ ] Parse hook payloads safely from JSON stdin.
- [ ] Consume common hook fields plus `PostToolUse` and `Stop` event-specific fields.
- [ ] Ensure hook handlers emit no stdout unless returning valid Codex hook JSON.
- [ ] Ensure `Stop` handlers never emit plain text on stdout.
- [ ] Map tool names and lifecycle events to capability tags.
- [ ] Store `HookObservation` records.
- [ ] Store derived `CapabilityEvent` records.
- [ ] Make hook records explainable in `get_capability_map`.
- [ ] Document hook enablement and verification.

### Phase 9: Recommendation Engine

- [ ] Define work item signal schema.
- [ ] Implement rules for large diffs and multi-area work.
- [ ] Implement rules for responsive UI, layout, browser, and settings-page work.
- [ ] Implement rules for visual/screenshot work.
- [ ] Implement rules for PR and review work.
- [ ] Implement rules for repeated setup or release workflows.
- [ ] Implement rules for branch juggling and worktree opportunities.
- [ ] Implement suppression when a capability was used recently.
- [ ] Implement deterministic ranking.
- [ ] Limit recommendations to two per work item.
- [ ] Persist recommendations.
- [ ] Implement `get_recommendations`.
- [ ] Verify demo work item recommendations match the required script.

### Phase 10: Feedback, Reset, and Deletion

- [ ] Implement `mark_recommendation_feedback`.
- [ ] Support useful/not-useful ratings.
- [ ] Optionally support a short note.
- [ ] Implement `reset_demo_state`.
- [ ] Seed deterministic fallback capability events for demo.
- [ ] Seed deterministic fallback work items for demo.
- [ ] Reset `last_seen_updates_at` for update-delta demo.
- [ ] Implement `delete_local_history`.
- [ ] Confirm deletion is limited to plugin-owned state.

### Phase 11: README and Demo Script

- [ ] Write root `README.md`.
- [ ] Add install instructions for the Codex app plugin directory.
- [ ] Add CLI `/plugins` fallback instructions.
- [ ] Add hook enablement instructions.
- [ ] Add hook verification instructions.
- [ ] Document approval requirements for session metadata, plugin metadata, local exports, and logs.
- [ ] Add CLI command examples.
- [ ] Add `--repo <path>` examples.
- [ ] Add reset and deletion instructions.
- [ ] Add troubleshooting section.
- [ ] Add hackathon demo script.

### Phase 12: Verification

- [ ] Run package install.
- [ ] Run typecheck.
- [ ] Run unit tests if present.
- [ ] Run `codex-coach status --json`.
- [ ] Run `codex-coach reset_demo_state --json`.
- [ ] Run `codex-coach get_updates --json`.
- [ ] Run `codex-coach get_capability_map --json`.
- [ ] Run `codex-coach get_recent_work --json`.
- [ ] Run `codex-coach get_recommendations --json`.
- [ ] Run `codex-coach coach --json`.
- [ ] Validate all `--json` outputs against the expected envelope and data shape.
- [ ] Pass representative `PostToolUse` and `Stop` payloads into `record_hook_observation --json`.
- [ ] Run a feedback command against a real recommendation ID.
- [ ] Verify generated output contains no raw source contents.
- [ ] Verify generated output contains no raw prompts or raw log bodies.
- [ ] Verify every update capability tag is canonical.
- [ ] Verify all demo fallback records have `source: demo-fallback`.
- [ ] Verify local history deletion.
- [ ] Reinstall or reload the plugin in the Codex app.
- [ ] Rehearse the full demo path.

## 12. Suggested Milestones

### Milestone A: Installable Skeleton

Deliverables:

- Plugin manifest.
- Marketplace entry.
- Skill file.
- README stub.
- CLI binary that returns placeholder JSON.

Exit criteria:

- Plugin appears in Codex install surface.
- `codex-coach coach --json` runs locally.

### Milestone B: Demo Data Pipeline

Deliverables:

- SQLite storage.
- Changelog cache.
- Demo reset.
- Capability taxonomy.
- Fallback demo work items.

Exit criteria:

- `reset_demo_state` creates a predictable demo state.
- `coach --json` returns the required updates and demo work items.

### Milestone C: Real Local Signals

Deliverables:

- Git importer.
- Hook recorder.
- Capability aggregation.

Exit criteria:

- A real repository produces recent work items without reading file contents.
- Hook observations appear when hooks are enabled.

### Milestone D: Recommendation and Polish

Deliverables:

- Rules recommender.
- Feedback capture.
- README complete.
- Demo script complete.

Exit criteria:

- Demo work items produce required recommendations.
- A fresh tester can install, run, reset, and delete local data from README instructions.

## 13. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Codex app plugin directory is unavailable or unstable | Maintain CLI `/plugins` fallback demo path |
| Hooks are disabled or unavailable | Make hooks additive; rely on git metadata and demo fallback |
| Sparse local git history | Seed fallback records only in demo mode and label them clearly |
| Plugin docs or manifest schema changes | Keep manifest minimal and validate early |
| Changelog fetching is unreliable during demo | Bundle normalized real changelog entries locally with source URLs |
| Recommendations feel generic | Use concrete work signals and demo-specific work item titles |
| Privacy concern from repo inspection | Avoid file content reads and document exact metadata used |

## 14. Definition of Done

The hackathon MVP is done when:

- Codex Coach can be installed from the repo-local marketplace.
- The skill can be invoked from a Codex thread.
- The default readout includes updates, capability map, and recent work review.
- The demo reset produces a reliable update delta and the two required recommendation moments.
- Real git metadata is used when available.
- Hooks can record best-effort events when enabled.
- Feedback, reset, and deletion commands work.
- README instructions are sufficient for a fresh local install.
- No MVP path requires sending private code or raw work history off-machine.
