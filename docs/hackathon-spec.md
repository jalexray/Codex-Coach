# Codex Coach Hackathon Spec

Last updated: April 30, 2026

## Decisions So Far

- Primary surfaces: Codex CLI and the Codex app.
- Deployment model: local-first, personal, open source Codex plugin.
- Authentication: no hosted login required for the MVP; use local plugin/session state.
- Data: use the user's real local data where available.
- Demo-critical feature: "new Codex features since last plugin invocation."
- Recommendation focus: include computer use as a visible recommendation path.
- MVP packaging: repo-local plugin marketplace entry for hackathon testing.
- Local analysis: build CLI-first command tooling, with command names that can become MCP tools later.
- Demo install surface: show the Codex app plugin directory first; keep CLI `/plugins` as the fallback.
- Work inspection: use git metadata, filenames, diff stats, branch names, commit messages, and user-provided summaries by default; do not inspect file contents in the MVP.
- Recommendation generation: rules decide recommendations; Codex can phrase the final thread output from structured local results.
- Demo reset and privacy: provide explicit `reset_demo_state` and `delete_local_history` actions.
- Usage capture: bundle Codex hooks to write local capability events after turns/tools run, documenting which Codex features were used when signals are available.
- Repository scope: scan the current repo by default and support an optional `--repo <path>` argument.
- Changelog source: use real Codex changelog entries, not fake updates; local data may cache normalized real entries with source URLs.
- Demo changelog highlights: use the real 2026-04-23, 2026-04-16 app, 2026-04-07, and 2026-03-25 Codex changelog entries.
- Flagship computer-use work item: "Debugged settings page layout across desktop and mobile."
- Fallback labeling: any generated fallback record must use `source: demo-fallback`.
- User setup: include a README with install, local marketplace, hook enablement, demo reset, deletion, and troubleshooting instructions.

## Summary

Codex Coach helps developers get more value from OpenAI Codex by turning product updates, personal usage patterns, and recent work history into practical next-step recommendations.

When users invoke the Codex Coach plugin in a new Codex thread, they see:

1. New Codex capabilities that shipped since their last plugin invocation.
2. A personal usage map showing which Codex features they use often, rarely, or have not been observed using.
3. A review of recently completed work with suggestions for Codex features that may have made similar work faster or higher quality.

The hackathon MVP is an installable Codex plugin: it lives inside Codex as a bundled skill plus local tooling, helping users notice better ways to use Codex while keeping their work history on their machine.

## Problem

Codex has multiple surfaces and workflows: local CLI or IDE pairing, cloud task delegation, GitHub code review, parallel agents, worktree-backed workflows, skills, automations, and potentially computer-use style interaction patterns. Codex also launches new features with astounding frequency - sometimes multiple new features per week. Users can miss new functionality, default to familiar usage, or fail to recognize when a past task would have been a good fit for a different Codex capability. 

This creates three user problems:

- Product discovery is passive. Users may not know what changed since their last session.
- Feature adoption is invisible. Users do not have a simple picture of which Codex workflows they have or have not tried.
- Reflection is manual. Users rarely review completed work and ask whether another Codex workflow would have produced a better result.

## Goals

- Help users discover new Codex features at the moment they are most likely to act: when they open Codex or start a new thread within it.
- Track Codex capability usage in a way that is understandable, privacy-aware, and actionable.
- Recommend underused Codex workflows based on recently completed work.
- Produce a compelling hackathon demo using real local data where available.

## Non-Goals

- Reimplementing Codex.
- Building a full analytics warehouse.
- Building a standalone web app.
- Guaranteeing complete telemetry across every Codex surface in the MVP.
- Sending private source code or raw work history to external services without explicit user consent.
- Providing generic coding productivity advice unrelated to Codex functionality.

## Source Context

Current OpenAI Help Center materials describe Codex as an AI coding agent that can help users write, review, and ship code through local tools or cloud delegation. The MVP should emphasize Codex CLI and Codex app workflows first. Relevant capabilities for this spec include:

- Codex CLI and IDE workflows for local repo navigation, edits, commands, and tests.
- Codex app workflows including multiple agents in parallel, hooks, worktree support, skills, automations, integrations, and git functionality.
- GitHub code review automation.
- Codex web/cloud tasks that run in isolated sandboxes and can be reviewed or merged.
- Codex changelog updates as a likely source for feature-delta content.

References:

- OpenAI Developers: Codex Plugins, https://developers.openai.com/codex/plugins
- OpenAI Developers: Build plugins, https://developers.openai.com/codex/plugins/build
- OpenAI Developers: Codex Hooks, https://developers.openai.com/codex/hooks
- OpenAI Help Center: Codex Changelog, https://help.openai.com/en/articles/11428266-codex-changelog
- OpenAI Help Center: Using Codex with your ChatGPT plan, https://help.openai.com/en/articles/11369540
- OpenAI Help Center: OpenAI Codex CLI - Getting Started, https://help.openai.com/en/articles/11096431-openai-codex-ci-getting-started

## Plugin Target

Codex Coach should be built as a Codex plugin, not a companion app. OpenAI's plugin docs describe plugins as bundles that can include skills, app integrations, MCP servers, hooks, assets, and install-surface metadata. The MVP should use that model directly.

### MVP Plugin Components

- `.codex-plugin/plugin.json`: required plugin manifest.
- `skills/coach/SKILL.md`: user-facing workflow that tells Codex how to run Codex Coach, interpret results, and present recommendations.
- CLI-first local command tooling for structured actions such as `get_updates`, `get_capability_map`, `get_recent_work`, `get_recommendations`, `mark_recommendation_feedback`, `reset_demo_state`, and `delete_local_history`.
- `hooks/hooks.json`: bundled lifecycle config that records best-effort local capability events after supported tool use and at turn stop.
- `.mcp.json`: optional post-MVP wrapper that exposes the same local actions as structured MCP tools.
- `assets/`: optional icon, logo, and screenshots for plugin install surfaces.
- `.agents/plugins/marketplace.json`: repo-local marketplace entry so the plugin can be installed and tested from this repo during the hackathon.
- Local data directory: plugin-owned storage for `last_seen_updates_at`, imported metadata, recommendations, and feedback.

### MVP Plugin Constraints

- The primary MVP experience is Codex thread output in the CLI or Codex app, not a separate browser dashboard.
- The plugin should expose clear prompts such as "Use Codex Coach to show what's new" and "Use Codex Coach to review my recent work."
- The plugin should be installable from a local marketplace and verified after restarting Codex.
- The primary demo should use the Codex app plugin directory when available; the CLI `/plugins` flow is the prepared fallback.
- Any manifest paths must be relative to the plugin root and use `./` prefixes.
- For the hackathon, official public plugin publishing is out of scope; local marketplace installation is enough.
- Hooks require Codex hooks to be enabled in the user's config. If hooks are unavailable, Codex Coach still works from git metadata, user-provided summaries, and explicitly imported data.
- The plugin can bundle hook lifecycle config, but users must enable the Codex hooks feature flag in their own Codex config when their environment does not already enable it.
- SessionStart hook messages may not render immediately under the initial Codex CLI banner. Verification should rely on a hook-written marker file or recorded observation, then treat the UI warning/status line as best-effort presentation.

## Target Users

- Individual developers using Codex CLI and Codex app workflows.
- Hackathon participants or professional developers trying to ramp up on newer Codex features.
- Team leads who want developers to adopt more effective Codex workflows without requiring formal training.

## MVP User Journey

1. User installs Codex Coach from the repo-local plugin marketplace.
2. User starts a new Codex thread and invokes the plugin by prompt or explicit `@Codex Coach` / bundled skill selection.
3. The Codex Coach skill calls local plugin tools and reads the user's last-seen timestamp from local storage.
4. Codex shows a "What's New Since You Were Here" section with Codex updates after that timestamp.
5. Codex shows a feature usage map:
   - Used recently
   - Tried before, not recent
   - Not observed
   - Unknown or not connected
6. Codex shows recent completed work items.
   - For each work item, Codex Coach recommends zero to two Codex capabilities the user could try next time.
7. User can mark a recommendation as useful or not useful.

## Core Feature 1: New Feature Overview

### User Story

As a Codex user, I want to see what shipped since I last opened Codex Coach so I can quickly decide whether to try something new.

### MVP Behavior

- Store `last_seen_updates_at` locally.
- Maintain a normalized local cache of real Codex changelog updates with release date, title, summary, source URL, imported-at timestamp, and related capability tags.
- On plugin invocation, filter updates where `published_at > last_seen_updates_at`.
- On an ongoing basis, highlight any real changelog entries released since the user's previous Codex Coach session, including newer GitHub release anchors when they are the latest available source.
- Show the newest updates first. Name: What is it? When should you use it? 
- Treat this as demo-critical: the first response must clearly show at least one update delta when the sample profile has not opened the plugin recently.

*Note: For Hackathon, allow me to reset last_seen_updates_at so I can spoof not having logged in for a week*

### Acceptance Criteria

- A returning user sees only updates newer than their previous plugin invocation.
- A new user sees a compact "recent highlights" list.
- Each update maps to at least one Codex capability tag.
- Each displayed update links back to the real changelog source.

### Demo Highlight Entries

Use these four real changelog entries for the hackathon demo:

- `2026-04-23`: GPT-5.5 and Codex app updates. Map to `computer-use`, `hooks`, model/workflow discovery, and automatic approval reviews. Source: https://developers.openai.com/codex/changelog#codex-2026-04-23
- `2026-04-16-app`: Codex can now help with more of your work. Map to `computer-use`, `multimodal-input`, and richer app workflows. Source: https://developers.openai.com/codex/changelog#codex-2026-04-16-app
- `2026-04-07`: Codex model availability update. Map to model/workflow discovery and product-discovery updates. Source: https://developers.openai.com/codex/changelog#codex-2026-04-07
- `2026-03-25`: Build and install plugins in Codex. Map to `skills`, `plugins`, `mcp`, and plugin installation. Source: https://developers.openai.com/codex/changelog#codex-2026-03-25

## Core Feature 2: Codex Capability Usage Tracking

### User Story

As a Codex user, I want to know which Codex capabilities I have not used so I can experiment with workflows that may save me time.

### Capability Taxonomy

Initial capability tags, weighted toward CLI and Codex app:

- `cli-local-chat`: local CLI pairing.
- `codex-app-session`: Codex app usage.
- `cloud-task`: delegated task from the Codex app or cloud-backed flow.
- `parallel-agents`: multiple agents working in parallel.
- `worktree-flow`: worktree-backed task isolation.
- `skills`: reusable Codex skills.
- `automations`: scheduled or triggered Codex workflows.
- `hooks`: hooks that have been set up & implemented.
- `git-workflow`: branch, diff, commit, PR, or merge assistance.
- `computer-use`: browser or UI interaction where appropriate.
- `multimodal-input`: screenshots, diagrams, or images used as context.
- `github-code-review`: Codex review on GitHub pull requests.
- `ide-extension`: IDE-based pairing.
- `voice-or-mobile`: optional future tag if mobile/voice workflows become relevant.

### MVP Behavior

- Track capability events with fields:
  - `user_id`
  - `capability`
  - `source`
  - `occurred_at`
  - `confidence`
  - `metadata`
- Display a feature matrix grouped by category:
  - Pairing surfaces
  - Delegation and parallelism
  - Review and git workflows
  - Context and input modes
  - Automation and reuse
- Identify observed and unobserved features by comparing collected signals against the capability taxonomy.

### MVP Data Source Strategy

- Local real data first:
  - Read the current repo by default.
  - Support an optional `--repo <path>` argument to scan a chosen repository.
  - Read local git metadata for recent commits, branches, file paths, file counts, diff stats, commit messages, and timestamps.
  - Use bundled hooks, when enabled, to record best-effort local capability events after supported tool use and at turn stop.
  - Read local Codex-related session or plugin metadata only where available, stable, and user-approved.
  - Allow users to point Codex Coach at local exports or logs.
  - Do not inspect file contents by default in the MVP.
- Seeded fallback:
  - Include sample events only when a real signal cannot be observed locally.
  - Mark all fallback records with `source: demo-fallback`.
- Future mode:
  - First-party telemetry, official local usage export, or richer hook events if available.

### Acceptance Criteria

- The system can render a user's most-used, least-used, and not-observed capabilities.
- Each tracked event is explainable by source.
- The output distinguishes "not observed" from "not enough data."
- Hook-captured events are shown as best-effort local observations, not complete telemetry.

## Core Feature 3: Recent Work Review and Better-Tool Suggestions

### User Story

As a Codex user, I want a short review of recent completed work so I can learn which Codex capability to try on similar tasks next time.

### Inputs

Recommended MVP work item sources:

- Local git commits and branches.
- Local unmerged worktrees or recent branches.
- Codex CLI/session metadata if available.
- Codex app/plugin event hooks if enabled.
- User-entered work summaries as a fallback.
- Optional demo-mode sample work items only when real local history is sparse.
- Seeded UI/browser QA work item titled "Debugged settings page layout across desktop and mobile" for the flagship computer-use recommendation if real history does not provide one.

### Recommendation Examples

- Large feature split across multiple files:
  - "Try cloud tasks or parallel agents next time so independent parts can run separately."
- PR opened without prior review:
  - "Try GitHub code review before asking teammates."
- Repeated repo setup or release workflow:
  - "Try an automation or reusable skill."
- UI debugging with screenshots:
  - "Try multimodal input or computer use so Codex can inspect the screen state."
- Responsive browser QA:
  - "Try computer use next time so Codex can inspect the rendered desktop and mobile states directly."
- Manual branch juggling:
  - "Try worktree-backed flows for isolated task attempts."

### MVP Recommendation Method

Use a rules-first recommender for the hackathon demo. The local tool returns structured signals and recommendation IDs; Codex may phrase the final thread output from those results.

- Classify work items by signals such as files changed, PR comments, test failures, labels, commit count, task duration, and keywords.
- Map those signals to Codex capabilities.
- Suppress recommendations for capabilities the user already used recently unless the recommendation explains a better pattern.
- Include one-sentence reasoning with each suggestion.
- Do not make separate OpenAI API calls for summarization in the MVP.
- Do not use an LLM as the source of truth for recommendation selection.

This is the suggested approach because hackathon demos need predictable recommendations, while Codex-authored phrasing from structured local results can still make the experience feel personal. Future versions can add an LLM-based reviewer that proposes recommendations using the same capability taxonomy.

### Acceptance Criteria

- Each recent work item gets zero to two recommendations.
- Each recommendation names a specific Codex capability.
- Each recommendation explains why it applies.
- Users can provide feedback on recommendation quality.

## Data Model Draft

### LocalProfile

- `id`
- `display_name`
- `last_seen_updates_at`
- `created_at`

### CodexUpdate

- `id`
- `published_at`
- `title`
- `summary`
- `source_url`
- `capability_tags`
- `imported_at`

### CapabilityEvent

- `id`
- `user_id`
- `capability`
- `source`
- `occurred_at`
- `confidence`
- `metadata`

### HookObservation

- `id`
- `session_id`
- `turn_id`
- `hook_event_name`
- `tool_name`
- `source`
- `observed_at`
- `capability_tags`
- `metadata`

### WorkItem

- `id`
- `user_id`
- `source`
- `title`
- `summary`
- `completed_at`
- `signals`
- `artifact_url`
- `repo_path`

### Recommendation

- `id`
- `user_id`
- `work_item_id`
- `capability`
- `message`
- `reason`
- `status`
- `created_at`

## Suggested MVP Architecture

- Package shape: open source Codex plugin.
- User experience: Codex thread output with three structured sections:
  - What's new
  - Capability map
  - Recent work review
- Plugin manifest: `.codex-plugin/plugin.json` with package metadata, skill pointer, optional MCP pointer, and install-surface metadata.
- Skill: `skills/coach/SKILL.md` describing when to use Codex Coach, how to call local tools, and how to present results.
- Local tools: CLI-first command layer for updates, usage events, work items, recommendations, feedback, demo reset, and history deletion.
- Hooks: bundled `hooks/hooks.json` invokes the CLI command layer for best-effort capability observation on supported Codex lifecycle events.
- MCP wrapper: optional post-MVP wrapper over the same command layer if time allows.
- Database: SQLite stored locally in the user's Codex Coach data directory.
- Recommender: deterministic rules module using the capability taxonomy.
- Marketplace: repo-local `.agents/plugins/marketplace.json` pointing at `./plugins/codex-coach` for hackathon installation.
- Importers:
  - Real Codex changelog importer with local normalized cache.
  - Local git importer.
  - Local hook observation importer where enabled.
  - Demo fallback importer.

### Proposed Plugin Layout

```text
plugins/codex-coach/
  .codex-plugin/
    plugin.json
  skills/
    coach/
      SKILL.md
  hooks/
    hooks.json
  package.json
  bin/
    codex-coach
  src/
    cli.ts
    hooks/
    importers/
    recommender/
    storage/
  data/
    codex-updates.json
  assets/
    icon.png
  .mcp.json
.agents/plugins/
  marketplace.json
```

`plugins/codex-coach/.mcp.json` is optional for the MVP. If included, it should wrap the same command layer rather than duplicating recommendation or importer logic.

## Suggested Implementation Stack

Recommended hackathon stack:

- TypeScript for the CLI command layer, importers, storage, and rules engine.
- Codex skill markdown for the user-facing workflow.
- Codex hooks for best-effort local usage capture when the user has enabled hooks.
- Node CLI command for filesystem/git inspection.
- SQLite for local persistence.
- Repo-local Codex marketplace metadata for install testing.

Reasoning:

- TypeScript keeps local tools and recommendation rules in one language.
- A bundled skill gives Codex the workflow instructions without needing a separate UI.
- Bundled hooks can create first-party-feeling local observations without relying only on inference.
- CLI-first tooling is faster to build and debug, while keeping a clean path to a later MCP wrapper.
- SQLite is easy to inspect, reset, and ship locally.
- Local git inspection is straightforward from Node without requiring hosted infrastructure.
- A repo-local marketplace is the fastest way to prove the plugin install path during the hackathon.

## Setup Documentation

Add a repo `README.md` as part of the MVP scope. It should cover:

- What Codex Coach does and what data stays local.
- How to install the plugin from the repo-local marketplace.
- How to invoke Codex Coach from the Codex app and CLI.
- How to enable Codex hooks when needed by adding:

```toml
[features]
codex_hooks = true
```

- How to verify hooks are enabled and hook observations are being written. Include a marker-file check because SessionStart warnings may appear after the first interaction rather than directly under the startup banner.
- How to run `codex-coach get_updates`, `get_capability_map`, `get_recent_work`, `get_recommendations`, `reset_demo_state`, and `delete_local_history`.
- How `--repo <path>` works and that the current repo is used by default.
- How real Codex changelog entries are imported and cached.
- How fallback data is labeled with `source: demo-fallback`.
- How to troubleshoot missing plugin marketplace entries, disabled hooks, empty git history, and local data deletion.

## Demo Script

1. Open the Codex app plugin directory and show Codex Coach installed from the repo-local marketplace.
2. Start a new Codex thread and invoke Codex Coach.
3. Show three new Codex updates since the user's last plugin invocation.
4. Show the capability map and highlight not-observed features.
5. Show recent local commits, branches, or Codex session-derived work items.
6. Ask Codex Coach to inspect the seeded or real UI/browser QA work item titled "Debugged settings page layout across desktop and mobile."
7. Show recommendation: "Try computer use or multimodal input next time so Codex can inspect the rendered desktop and mobile states directly."
8. Ask Codex Coach to inspect the work item titled "Large refactor across auth and billing."
9. Show recommendation: "Try parallel agents or cloud tasks for separable workstreams."
10. Mark one recommendation as useful.

Fallback demo path: use Codex CLI `/plugins` to show installation and invocation if the Codex app plugin directory is not available or stable.

## Privacy and Safety

- Running locally changes the privacy tradeoff, but not the need for clear consent.
- Do not send source code, prompts, local logs, or raw work history off-machine by default.
- Prefer metadata and summaries over raw code for the MVP.
- Do not inspect source file contents by default in the MVP.
- Allow deeper local-only inspection only as a future opt-in mode.
- Make all import sources explicit.
- Label generated fallback records with `source: demo-fallback`.
- Label hook records as best-effort local observations.
- Let users delete imported history with `delete_local_history`.
- Let users replay the demo with `reset_demo_state`.
- Show confidence and source for inferred capability usage.
- Avoid claiming that a user "should have" used a feature when evidence is weak; phrase as "try next time" or "may fit similar work."

## Remaining Open Questions

- Can the plugin-bundled hook write to the local Codex Coach data directory as expected after restart?

## Next Build Steps

1. Scaffold `plugins/codex-coach/.codex-plugin/plugin.json`.
2. Add `skills/coach/SKILL.md` with the Codex Coach workflow and presentation rules.
3. Add `.agents/plugins/marketplace.json` for repo-local plugin installation.
4. Add `README.md` with setup, hook enablement, verification, reset, deletion, and troubleshooting instructions.
5. Build the CLI-first command layer with actions named for future MCP tools.
6. Add `--repo <path>` support, defaulting to the current repo.
7. Add `hooks/hooks.json` and hook handlers that write best-effort local capability observations.
8. Import and normalize real Codex changelog entries with source URLs.
9. Finalize the CLI/app-focused capability taxonomy.
10. Build local git importer for recent work items.
11. Implement rules-based recommendation engine.
12. Add feedback, `reset_demo_state`, and `delete_local_history` actions.
13. Add `source: demo-fallback` seeded fallback data for capability events and the "Debugged settings page layout across desktop and mobile" work item only when real data is sparse.
14. Polish demo script using the Codex app plugin directory, with CLI `/plugins` fallback.
