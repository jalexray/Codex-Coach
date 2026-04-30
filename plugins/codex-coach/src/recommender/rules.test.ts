import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoWorkItems } from "./fixtures";
import { selectRecommendationCandidates } from "./rules";

describe("recommendation rules", () => {
  it("maps the settings layout demo item to rendered UI or visual context", () => {
    const workItem = demoWorkItems().find((item) => item.id === "demo-settings-layout");
    assert.ok(workItem);

    const capabilities = selectRecommendationCandidates(workItem, new Set()).map((candidate) => candidate.capability);
    assert.ok(capabilities.includes("computer-use") || capabilities.includes("multimodal-input"));
  });

  it("maps the auth and billing demo refactor to delegation", () => {
    const workItem = demoWorkItems().find((item) => item.id === "demo-auth-billing-refactor");
    assert.ok(workItem);

    const capabilities = selectRecommendationCandidates(workItem, new Set()).map((candidate) => candidate.capability);
    assert.ok(capabilities.includes("parallel-agents") || capabilities.includes("cloud-task"));
  });

  it("suppresses recent capabilities when an alternate candidate exists", () => {
    const workItem = demoWorkItems().find((item) => item.id === "demo-auth-billing-refactor");
    assert.ok(workItem);

    const capabilities = selectRecommendationCandidates(workItem, new Set(["parallel-agents"])).map(
      (candidate) => candidate.capability
    );
    assert.equal(capabilities[0], "cloud-task");
  });
});
