import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CoachError } from "../lib/errors";
import {
  assertSafeDeleteTarget,
  isSameOrInsidePath,
  resolveDatabasePath,
  resolvePluginDataDir
} from "./paths";

test("resolvePluginDataDir resolves explicit and default data directories", () => {
  const originalXdgDataHome = process.env.XDG_DATA_HOME;

  try {
    delete process.env.XDG_DATA_HOME;

    assert.equal(resolvePluginDataDir("/tmp/codex-coach-test"), path.resolve("/tmp/codex-coach-test"));
    assert.equal(
      resolveDatabasePath("/tmp/codex-coach-test"),
      path.resolve("/tmp/codex-coach-test/codex-coach.sqlite")
    );
    assert.equal(resolvePluginDataDir(), path.join(os.homedir(), ".local", "share", "codex-coach"));
  } finally {
    if (originalXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    }
  }
});

test("isSameOrInsidePath detects path containment", () => {
  assert.equal(isSameOrInsidePath("/tmp/demo/child", "/tmp/demo"), true);
  assert.equal(isSameOrInsidePath("/tmp/demo", "/tmp/demo"), true);
  assert.equal(isSameOrInsidePath("/tmp/demo-sibling", "/tmp/demo"), false);
});

test("assertSafeDeleteTarget requires explicit override for non-default dirs", () => {
  assert.throws(
    () =>
      assertSafeDeleteTarget({
        dataDir: "/tmp/codex-coach-test",
        repo: "/tmp/repo",
        explicitDataDir: false,
        defaultDataDir: "/tmp/default-codex-coach"
      }),
    CoachError
  );

  assert.doesNotThrow(() =>
    assertSafeDeleteTarget({
      dataDir: "/tmp/codex-coach-test",
      repo: "/tmp/repo",
      explicitDataDir: true,
      defaultDataDir: "/tmp/default-codex-coach"
    })
  );
});

test("assertSafeDeleteTarget refuses to delete from the inspected repo", () => {
  assert.throws(
    () =>
      assertSafeDeleteTarget({
        dataDir: "/tmp/repo/.codex-coach",
        repo: "/tmp/repo",
        explicitDataDir: true
      }),
    CoachError
  );
});
