import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildHookObservation } from "./observation";
import { recordHookObservation } from "./record";
import {
  postToolUseApplyPatchFixture,
  postToolUseBashGitFixture,
  postToolUseMcpFixture,
  stopFixture
} from "./__fixtures__/payloads";
import type { CommandContext } from "../types/commands";

test("PostToolUse apply_patch stores patch metadata without source or response bodies", () => {
  const built = buildHookObservation({
    stdin: JSON.stringify(postToolUseApplyPatchFixture),
    observedAt: "2026-04-30T00:00:00.000Z"
  });

  assert.ok(built.observation);
  assert.deepEqual(built.warnings, []);
  assert.ok(built.observation.capability_tags.includes("hooks"));
  assert.ok(built.observation.capability_tags.includes("git-workflow"));

  const serialized = JSON.stringify(built.observation);
  assert.doesNotMatch(serialized, /RAW_SOURCE_SECRET/);
  assert.doesNotMatch(serialized, /RAW_TOOL_RESPONSE_SECRET/);
  assert.match(serialized, /src\/secret-example\.ts/);
});

test("PostToolUse Bash and MCP payloads derive supported capability events safely", () => {
  const bash = buildHookObservation({
    stdin: JSON.stringify(postToolUseBashGitFixture),
    observedAt: "2026-04-30T00:00:00.000Z"
  });
  assert.ok(bash.observation?.capability_tags.includes("git-workflow"));
  assert.ok(bash.observation?.capability_tags.includes("worktree-flow"));
  assert.doesNotMatch(JSON.stringify(bash.observation), /RAW_COMMAND_SECRET|RAW_BASH_STDOUT_SECRET/);

  const mcp = buildHookObservation({
    stdin: JSON.stringify(postToolUseMcpFixture),
    observedAt: "2026-04-30T00:00:00.000Z"
  });
  assert.ok(mcp.observation?.capability_tags.includes("mcp"));
  assert.ok(mcp.observation?.capability_tags.includes("github-code-review"));
  assert.doesNotMatch(JSON.stringify(mcp.observation), /RAW_MCP_BODY_SECRET|RAW_MCP_RESPONSE_SECRET/);
});

test("Stop payload stores assistant message shape only", () => {
  const built = buildHookObservation({
    stdin: JSON.stringify(stopFixture),
    observedAt: "2026-04-30T00:00:00.000Z"
  });

  assert.ok(built.observation);
  assert.ok(built.observation.capability_tags.includes("hooks"));
  assert.doesNotMatch(JSON.stringify(built.observation), /RAW_ASSISTANT_MESSAGE_SECRET|do not store/);
  assert.match(JSON.stringify(built.observation.metadata), /code_fence_count/);
});

test("recordHookObservation appends observation and derived event JSONL", async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "codex-coach-hooks-test-"));
  const ctx: CommandContext = {
    command: "record_hook_observation",
    generated_at: "2026-04-30T00:00:00.000Z",
    repo: "/tmp/codex-coach-fixture",
    json: true,
    data_dir: dataDir,
    demo: false
  };

  try {
    const result = await recordHookObservation({
      ctx,
      stdin: JSON.stringify(postToolUseApplyPatchFixture)
    });

    assert.ok(result.data.observation_id);
    assert.ok(result.data.derived_capability_event_ids.length >= 1);

    const observations = await readFile(path.join(dataDir, "hook-observations.jsonl"), "utf8");
    const events = await readFile(path.join(dataDir, "capability-events.jsonl"), "utf8");
    assert.match(observations, /PostToolUse/);
    assert.match(events, /git-workflow|hooks/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
