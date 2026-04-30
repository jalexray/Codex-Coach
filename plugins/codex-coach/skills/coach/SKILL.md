---
name: coach
description: Run Codex Coach to render a local-first coaching readout with Codex updates, capability usage, and recent work recommendations.
---

# Codex Coach

Use this skill when the user asks Codex Coach to show what is new, review recent work, map Codex capabilities they have used, suggest Codex workflows to try next time, reset the demo, delete local Codex Coach history, or record feedback on a recommendation.

## Command Contract

For the default readout, run:

```bash
codex-coach coach --json
```

If the user provides a repository path, demo mode, or data directory, pass only the matching stable global option from the CLI contract:

```bash
codex-coach coach --json --repo <path>
codex-coach coach --json --demo
codex-coach coach --json --data-dir <path>
```

The CLI response is the source of truth. Render only from the structured JSON envelope returned by `codex-coach coach --json`; do not inspect repository files, read prompts or logs, invent updates, infer capability usage, or add recommendations that are not present in `data.recommendations.recommendations`.

If the command returns `ok: false`, show the CLI error message and stop. If `warnings` is non-empty, include the warnings briefly before the readout.

## Required Readout

Render exactly these three sections for a successful default readout:

1. What's new
2. Capability map
3. Recent work review

Keep the response concise and practical. Phrase recommendations as options to try next time, not as criticism.

### What's new

Use `data.updates.updates` for new updates. If that array is empty and `data.updates.recent_highlights` has entries, label them as recent highlights instead of new updates.

For each rendered update, include only fields from the payload:

- Date from `published_at`
- `title`
- `summary`
- `when_to_use`
- `source_url`
- `capability_tags`, and `update_topic_tags` only when useful for clarity

Every product update must have a real `source_url`. Never create fake changelog entries or source URLs. If no updates or highlights are returned, say that the CLI returned no Codex updates for this run.

### Capability map

Use `data.capability_map.summary` and `data.capability_map.groups`.

Group capabilities by the returned group labels. Preserve the returned status for each capability:

- `used_recently`: observed in recent local metadata
- `tried_before_not_recent`: observed before, but not recently
- `not_observed`: supported by the taxonomy but not seen in available local metadata
- `unknown_or_not_connected`: the CLI cannot assess this capability from connected local sources

For observed capabilities, include `event_count`, `last_observed_at` when present, and source labels from `sources`. Describe hook-derived observations as best-effort local observations, not complete telemetry.

### Recent work review

Use `data.recent_work.work_items` and `data.recommendations.recommendations`.

For each work item, include:

- `title`
- `summary`
- `completed_at`
- `source`
- `artifact_url` or `repo_path` when present

Attach only recommendations whose `work_item_id` matches the work item. Render at most the recommendations returned by the CLI, using their `capability`, `message`, `reason`, `status`, and `work_item_source`. If a work item has no returned recommendation, say no recommendation was returned for it.

Never recommend a capability from your own reading of a work title, summary, branch name, or file path. Recommendation selection belongs to the CLI.

## Source And Fallback Labels

Preserve source labels from records and top-level `sources`. Explain them in user-facing language when they affect trust:

- `codex-changelog`: real Codex changelog data; include the source URL.
- `git`: local git metadata such as commits, branches, filenames, or diff stats.
- `hook`: best-effort local hook observation.
- `user-summary`: work summary explicitly provided by the user.
- `codex-session`: local Codex session metadata explicitly approved by the user.
- `codex-plugin-metadata`: local plugin metadata explicitly approved by the user.
- `local-import`: local export or log metadata explicitly selected by the user.
- `demo-fallback`: deterministic demo fallback data; label it as demo fallback.

Do not treat `demo-fallback` as real user history. Do not hide fallback labels.

## Feedback, Reset, And Deletion

For recommendation feedback, use the stable feedback command only after the user tells you which recommendation and rating to record:

```bash
codex-coach mark_recommendation_feedback --json --recommendation-id <id> --rating useful
codex-coach mark_recommendation_feedback --json --recommendation-id <id> --rating not-useful
```

Include `--note <text>` only when the user provides a note. Report the returned `data.feedback` fields; do not infer persistence details.

For a demo reset, run only on explicit request:

```bash
codex-coach reset_demo_state --json --demo
```

Summarize `data.seeded_records` and `data.last_seen_updates_at` from the result.

For local history deletion, run only on explicit request:

```bash
codex-coach delete_local_history --json
```

Summarize `data.deleted` and `data.data_dir` from the result. Do not claim that any repository files were deleted.
