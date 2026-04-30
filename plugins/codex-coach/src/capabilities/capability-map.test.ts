import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildCapabilityMap, getCapabilityMapResult } from "./map";
import { CAPABILITY_IDS } from "./taxonomy";
import { recordCapabilityEvents } from "./events";
import { SOURCE_LABELS } from "../types/sources";
import type { CommandContext } from "../types/commands";
import type { CapabilityEvent } from "../types/entities";

test("capability map returns every taxonomy capability exactly once", () => {
  const map = buildCapabilityMap("2026-04-30T19:00:00.000Z", []);
  const ids = map.groups.flatMap((group) => group.capabilities.map((capability) => capability.id));

  assert.equal(ids.length, CAPABILITY_IDS.length);
  assert.equal(new Set(ids).size, CAPABILITY_IDS.length);
  assert.deepEqual([...ids].sort(), [...CAPABILITY_IDS].sort());
  assert.equal(map.summary.total, CAPABILITY_IDS.length);
  assert.ok(map.summary.not_observed > 0);
  assert.ok(map.summary.unknown_or_not_connected > 0);
});

test("capability map aggregates events by capability", () => {
  const map = buildCapabilityMap("2026-04-30T19:00:00.000Z", [
    event("cli-1", "cli-local-chat", SOURCE_LABELS.HOOK, "2026-04-29T19:00:00.000Z", 0.75),
    event("cli-2", "cli-local-chat", SOURCE_LABELS.GIT, "2026-04-30T18:00:00.000Z", 0.95),
    event("skills-1", "skills", SOURCE_LABELS.LOCAL_IMPORT, "2026-01-01T00:00:00.000Z", 0.6)
  ]);

  const cli = findCapability(map, "cli-local-chat");
  assert.equal(cli.status, "used_recently");
  assert.equal(cli.event_count, 2);
  assert.equal(cli.last_observed_at, "2026-04-30T18:00:00.000Z");
  assert.equal(cli.confidence, 0.85);
  assert.deepEqual(
    cli.sources.map((source) => [source.label, source.record_count]),
    [
      [SOURCE_LABELS.GIT, 1],
      [SOURCE_LABELS.HOOK, 1]
    ]
  );
  assert.match(cli.sources.find((source) => source.label === SOURCE_LABELS.HOOK)?.description ?? "", /Best-effort/);

  assert.equal(findCapability(map, "skills").status, "tried_before_not_recent");
});

test("getCapabilityMapResult records and reads stored capability events", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-capability-map-"));
  const ctx = context(dataDir, false);

  await recordCapabilityEvents(ctx, [
    event("stored-1", "git-workflow", SOURCE_LABELS.GIT, "2026-04-30T18:00:00.000Z", 0.8)
  ]);

  const result = await getCapabilityMapResult(ctx);
  assert.equal(findCapability(result.data, "git-workflow").event_count, 1);
  assert.equal((result.sources ?? []).find((source) => source.label === SOURCE_LABELS.GIT)?.record_count, 1);
});

test("demo mode adds labeled fallback events when no local events exist", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-capability-demo-"));
  const result = await getCapabilityMapResult(context(dataDir, true));

  assert.ok((result.warnings ?? []).includes("demo_fallback_capability_events_used"));
  assert.ok((result.sources ?? []).some((source) => source.label === SOURCE_LABELS.DEMO_FALLBACK));
  assert.equal(findCapability(result.data, "cli-local-chat").status, "used_recently");
  assert.ok(result.data.summary.not_observed > 0);
});

function findCapability(map: ReturnType<typeof buildCapabilityMap>, capabilityId: string) {
  const capability = map.groups.flatMap((group) => group.capabilities).find((entry) => entry.id === capabilityId);
  assert.ok(capability, `Expected capability ${capabilityId} to exist.`);
  return capability;
}

function event(
  id: string,
  capability: CapabilityEvent["capability"],
  source: CapabilityEvent["source"],
  occurredAt: string,
  confidence: number
): CapabilityEvent {
  return {
    id,
    user_id: "local-test",
    capability,
    source,
    occurred_at: occurredAt,
    confidence,
    metadata: {}
  };
}

function context(dataDir: string, demo: boolean): CommandContext {
  return {
    command: "get_capability_map",
    generated_at: "2026-04-30T19:00:00.000Z",
    repo: process.cwd(),
    json: true,
    data_dir: dataDir,
    demo
  };
}
