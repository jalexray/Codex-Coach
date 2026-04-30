import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { composeCoachResult, getCoachResult } from "./coach";
import {
  placeholderCapabilityMapData,
  placeholderProfile,
  placeholderRecentWorkData,
  placeholderRecommendationsData,
  placeholderUpdatesData
} from "./placeholders";
import { SOURCE_LABELS, type SourceRef } from "../types/sources";
import type { CommandContext } from "../types/commands";

test("getCoachResult composes the default skill payload", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-aggregate-"));

  try {
    const result = await getCoachResult(context(dataDir, true));

    assert.equal(result.data.profile.id, "local-default");
    assert.ok(result.data.updates);
    assert.ok(result.data.capability_map);
    assert.ok(result.data.recent_work);
    assert.ok(result.data.recommendations);

    assert.ok(Array.isArray(result.data.updates.updates));
    assert.ok(Array.isArray(result.data.updates.recent_highlights));
    assert.ok(Array.isArray(result.data.capability_map.groups));
    assert.ok(Array.isArray(result.data.recent_work.work_items));
    assert.ok(Array.isArray(result.data.recommendations.recommendations));
    assert.ok(Array.isArray(result.warnings));
    assert.ok(Array.isArray(result.sources));

    const firstCapability = result.data.capability_map.groups[0]?.capabilities[0];
    assert.ok(firstCapability);
    assert.ok(Array.isArray(firstCapability.sources));

    assert.ok(!result.warnings.some((warning) => warning.includes("placeholder_implementation")));
    assert.equal(uniqueSourceKeys(result.sources).size, result.sources.length);
    assert.doesNotMatch(JSON.stringify(result), /RAW_SOURCE_SECRET|RAW_PROMPT_SECRET|RAW_LOG_BODY_SECRET/);
  } finally {
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("composeCoachResult deduplicates warnings and sources while preserving empty arrays", () => {
  const ctx = context("/tmp/codex-coach-compose-test", false);
  const duplicateSource: SourceRef = {
    label: SOURCE_LABELS.LOCAL_IMPORT,
    description: "Local aggregate test source.",
    path: "/tmp/codex-coach-compose-test/source.json",
    record_count: 1
  };

  const result = composeCoachResult({
    updates: {
      data: placeholderUpdatesData(ctx),
      warnings: ["duplicate_warning"],
      sources: [duplicateSource]
    },
    capabilityMap: {
      data: placeholderCapabilityMapData(),
      warnings: ["duplicate_warning", "capability_warning"],
      sources: [duplicateSource]
    },
    recentWork: {
      data: placeholderRecentWorkData(ctx),
      warnings: [],
      sources: [duplicateSource]
    },
    recommendations: {
      data: placeholderRecommendationsData(),
      warnings: ["capability_warning"],
      sources: [duplicateSource]
    },
    profile: {
      data: placeholderProfile(ctx),
      warnings: [],
      sources: [duplicateSource]
    }
  });

  assert.deepEqual(result.warnings, ["duplicate_warning", "capability_warning"]);
  assert.deepEqual(result.sources, [duplicateSource]);
  assert.deepEqual(result.data.updates.updates, []);
  assert.deepEqual(result.data.updates.recent_highlights, []);
  assert.deepEqual(result.data.recent_work.work_items, []);
  assert.deepEqual(result.data.recommendations.recommendations, []);
  assert.ok(Array.isArray(result.data.capability_map.groups[0]?.capabilities[0]?.sources));
});

function context(dataDir: string, demo: boolean): CommandContext {
  return {
    command: "coach",
    generated_at: "2026-04-30T19:00:00.000Z",
    repo: process.cwd(),
    json: true,
    data_dir: dataDir,
    demo
  };
}

function uniqueSourceKeys(sources: SourceRef[]): Set<string> {
  return new Set(
    sources.map((source) =>
      [
        source.label,
        source.description,
        source.path ?? "",
        source.url ?? "",
        source.record_count ?? ""
      ].join("\0")
    )
  );
}
