import test from "node:test";
import assert from "node:assert/strict";
import { buildCliInvocation, toolDefinitions } from "./tools";

test("MCP tool definitions expose the default coach tool", () => {
  assert.ok(toolDefinitions.some((tool) => tool.name === "coach"));
});

test("buildCliInvocation maps global options to CLI flags", () => {
  assert.deepEqual(
    buildCliInvocation("coach", {
      repo: "/tmp/repo",
      dataDir: "/tmp/codex-coach",
      demo: true
    }),
    {
      args: ["coach", "--json", "--repo", "/tmp/repo", "--data-dir", "/tmp/codex-coach", "--demo"]
    }
  );
});

test("buildCliInvocation maps feedback options to CLI flags", () => {
  assert.deepEqual(
    buildCliInvocation("mark_recommendation_feedback", {
      recommendationId: "rec-1",
      rating: "useful",
      note: "good fit"
    }),
    {
      args: [
        "mark_recommendation_feedback",
        "--json",
        "--recommendation-id",
        "rec-1",
        "--rating",
        "useful",
        "--note",
        "good fit"
      ]
    }
  );
});

test("buildCliInvocation serializes hook payloads as stdin", () => {
  assert.deepEqual(
    buildCliInvocation("record_hook_observation", {
      payload: {
        session_id: "s1",
        hook_event_name: "Stop"
      }
    }),
    {
      args: ["record_hook_observation", "--json"],
      stdin: '{"session_id":"s1","hook_event_name":"Stop"}'
    }
  );
});
