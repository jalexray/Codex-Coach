import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CAPABILITY_IDS } from "../capabilities/taxonomy";
import { SOURCE_LABELS } from "../types/sources";
import { DEFAULT_PROFILE_ID, openStorage } from "./repositories";

test("storage repositories persist required entities and counts", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-coach-storage-test-"));
  const generatedAt = "2026-04-30T12:00:00.000Z";
  const storage = await openStorage({ dataDir, generatedAt });

  try {
    const profile = storage.getOrCreateLocalProfile(generatedAt);
    assert.equal(profile.id, DEFAULT_PROFILE_ID);

    storage.upsertCodexUpdates([
      {
        id: "update-1",
        published_at: generatedAt,
        title: "Update",
        summary: "Summary",
        source_url: "https://example.test/update",
        capability_tags: [CAPABILITY_IDS[0]],
        update_topic_tags: ["demo"],
        imported_at: generatedAt,
        when_to_use: "Use this during demos."
      }
    ]);
    storage.upsertCapabilityEvents([
      {
        id: "event-1",
        user_id: DEFAULT_PROFILE_ID,
        capability: CAPABILITY_IDS[0],
        source: SOURCE_LABELS.DEMO_FALLBACK,
        occurred_at: generatedAt,
        confidence: 0.8,
        metadata: { origin: "test" }
      }
    ]);
    storage.upsertHookObservations([
      {
        id: "hook-1",
        session_id: "session-1",
        turn_id: null,
        hook_event_name: "PostToolUse",
        tool_name: "shell",
        source: SOURCE_LABELS.HOOK,
        observed_at: generatedAt,
        capability_tags: [CAPABILITY_IDS[0]],
        metadata: { tool: "shell" }
      }
    ]);
    storage.upsertWorkItems([
      {
        id: "work-1",
        user_id: DEFAULT_PROFILE_ID,
        source: SOURCE_LABELS.GIT,
        title: "Work item",
        summary: "Summary",
        completed_at: generatedAt,
        signals: { files_changed: 3 },
        artifact_url: null,
        repo_path: "/tmp/repo"
      }
    ]);
    storage.upsertRecommendations([
      {
        id: "recommendation-1",
        user_id: DEFAULT_PROFILE_ID,
        work_item_id: "work-1",
        capability: CAPABILITY_IDS[0],
        message: "Try this.",
        reason: "Because it matches the work item.",
        status: "new",
        created_at: generatedAt,
        work_item_source: SOURCE_LABELS.GIT
      }
    ]);
    storage.upsertRecommendationFeedback([
      {
        id: "feedback-1",
        recommendation_id: "recommendation-1",
        rating: "useful",
        note: null,
        created_at: generatedAt
      }
    ]);

    assert.deepEqual(storage.getCounts(), {
      codex_updates: 1,
      capability_events: 1,
      hook_observations: 1,
      work_items: 1,
      recommendations: 1,
      recommendation_feedback: 1
    });
  } finally {
    await storage.close();
  }

  const reopened = await openStorage({ dataDir, generatedAt });
  try {
    assert.equal(reopened.listCodexUpdates()[0]?.id, "update-1");
    assert.equal(reopened.listCapabilityEvents()[0]?.metadata.origin, "test");
    assert.equal(reopened.getLastHookObservationAt(), generatedAt);
    assert.equal(reopened.listWorkItems()[0]?.signals.files_changed, 3);
    assert.equal(reopened.listRecommendations()[0]?.work_item_source, SOURCE_LABELS.GIT);
    assert.equal(reopened.listRecommendationFeedback()[0]?.rating, "useful");
  } finally {
    await reopened.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
