import assert from "node:assert/strict";
import test from "node:test";
import { renderStartupUpdatesText, renderUpdatesText } from "./get-updates";
import type { GetUpdatesData } from "../types/command-data";
import type { CommandContext } from "../types/commands";
import type { CodexUpdate } from "../types/entities";

test("startup update text stays compact for hook warning rendering", () => {
  const text = renderStartupUpdatesText(context(), updatesData());

  assert.equal(text.includes("\n"), false);
  assert.match(text, /^Codex Coach startup updates \| 2 updates since your last demo reset/);
  assert.match(text, /\[2026-04-23\] GPT-5\.5 and Codex app updates/);
  assert.match(text, /\[2026-04-16\] Codex can now help with more of your work/);
  assert.doesNotMatch(text, /Use this when/);
  assert.doesNotMatch(text, /https:\/\/developers\.openai\.com/);
  assert.match(text, /Next: @Codex Coach show what's new and review my recent work$/);
});

test("human update text keeps detail in a readable report layout", () => {
  const text = renderUpdatesText(context(), updatesData());

  assert.match(text, /Codex Coach startup updates\n\n2 updates since your last demo reset\n\n1\. 2026-04-23 - GPT-5\.5 and Codex app updates/);
  assert.match(text, /Use when: Use this when you want a stronger model/);
  assert.match(text, /Source: https:\/\/developers\.openai\.com\/codex\/changelog#codex-2026-04-23/);
  assert.match(text, /Data dir: \/tmp\/codex-coach-test/);
  assert.match(text, /Next: @Codex Coach show what's new and review my recent work$/);
});

function context(): CommandContext {
  return {
    command: "get_updates",
    generated_at: "2026-04-30T19:00:00.000Z",
    repo: "/tmp/repo",
    json: false,
    data_dir: "/tmp/codex-coach-test",
    demo: true
  };
}

function updatesData(): GetUpdatesData {
  return {
    last_seen_updates_at: "2026-03-24T00:00:00.000Z",
    mode: "delta",
    updates: [
      update({
        id: "2026-04-23",
        published_at: "2026-04-23",
        title: "GPT-5.5 and Codex app updates",
        when_to_use:
          "Use this when you want a stronger model for implementation, refactors, debugging, testing, validation, or knowledge work.",
        source_url: "https://developers.openai.com/codex/changelog#codex-2026-04-23"
      }),
      update({
        id: "2026-04-16-app",
        published_at: "2026-04-16",
        title: "Codex can now help with more of your work",
        when_to_use: "Use this when a task needs Codex to inspect a running app.",
        source_url: "https://developers.openai.com/codex/changelog#codex-2026-04-16-app"
      })
    ],
    recent_highlights: [],
    next_mark_seen_at: "2026-04-30T19:00:00.000Z"
  };
}

function update(input: Pick<CodexUpdate, "id" | "published_at" | "title" | "when_to_use" | "source_url">): CodexUpdate {
  return {
    ...input,
    summary: "Test update summary.",
    capability_tags: ["codex-app-session"],
    update_topic_tags: ["test"],
    imported_at: "2026-04-30T00:00:00.000Z"
  };
}
