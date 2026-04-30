import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CAPABILITY_IDS } from "../capabilities/taxonomy";
import { getUpdates, importChangelog, markUpdatesSeen, resetUpdateDemoState } from "./service";
import type { CommandContext } from "../types/commands";

const capabilityIds = new Set(CAPABILITY_IDS);

test("bundled Codex updates import and validate against the taxonomy", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-updates-"));

  try {
    const result = await importChangelog(context("import_changelog", dataDir, "2026-04-30T12:00:00.000Z"));

    assert.equal(result.data.imported_count, 4);
    assert.equal(result.data.skipped_count, 0);
    assert.equal(result.data.refreshed, false);
    assert.deepEqual(
      result.data.updates.map((update) => update.id),
      ["2026-04-23", "2026-04-16-app", "2026-04-07", "2026-03-25"]
    );

    for (const update of result.data.updates) {
      assert.match(update.source_url, /^https:\/\/developers\.openai\.com\/codex\/changelog#codex-/);
      assert.ok(update.capability_tags.length > 0);
      for (const capabilityTag of update.capability_tags) {
        assert.ok(capabilityIds.has(capabilityTag), `${update.id} has unknown capability ${capabilityTag}`);
      }
    }
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("getUpdates returns new-user highlights, demo deltas, and marks seen", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-updates-"));

  try {
    await importChangelog(context("import_changelog", dataDir, "2026-04-30T12:00:00.000Z"));

    const firstRead = await getUpdates(context("get_updates", dataDir, "2026-04-30T12:01:00.000Z"));
    assert.equal(firstRead.data.mode, "new-user");
    assert.equal(firstRead.data.updates.length, 0);
    assert.equal(firstRead.data.recent_highlights.length, 3);

    const reset = await resetUpdateDemoState(context("reset_demo_state", dataDir, "2026-04-30T12:02:00.000Z"));
    assert.equal(reset.data.last_seen_updates_at, "2026-03-24T00:00:00.000Z");
    assert.equal(reset.data.seeded_records.find((record) => record.entity === "codex_updates")?.count, 4);

    const delta = await getUpdates(context("get_updates", dataDir, "2026-04-30T12:03:00.000Z"));
    assert.equal(delta.data.mode, "delta");
    assert.ok(delta.data.updates.length >= 3);

    await markUpdatesSeen(context("mark_updates_seen", dataDir, "2026-04-30T12:04:00.000Z"));

    const afterSeen = await getUpdates(context("get_updates", dataDir, "2026-04-30T12:05:00.000Z"));
    assert.equal(afterSeen.data.mode, "delta");
    assert.equal(afterSeen.data.updates.length, 0);

    const demoRead = await getUpdates(context("get_updates", dataDir, "2026-04-30T12:06:00.000Z", true));
    assert.equal(demoRead.data.mode, "delta");
    assert.ok(demoRead.data.updates.length >= 3);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

function context(command: string, dataDir: string, generatedAt: string, demo = false): CommandContext {
  return {
    command,
    generated_at: generatedAt,
    repo: process.cwd(),
    json: true,
    data_dir: dataDir,
    demo
  };
}
