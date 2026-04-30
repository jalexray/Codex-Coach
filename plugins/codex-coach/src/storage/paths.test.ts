import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CoachError } from "../lib/errors";
import {
  assertSafeDeleteTarget,
  CODEX_COACH_DATA_DIR_ENV,
  isSameOrInsidePath,
  resolveDatabasePath,
  resolvePluginDataDir
} from "./paths";

test("resolvePluginDataDir resolves explicit and default data directories", () => {
  const env = captureDataDirEnv();

  try {
    clearDataDirEnv();

    assert.equal(resolvePluginDataDir("/tmp/codex-coach-test"), path.resolve("/tmp/codex-coach-test"));
    assert.equal(
      resolveDatabasePath("/tmp/codex-coach-test"),
      path.resolve("/tmp/codex-coach-test/codex-coach.sqlite")
    );
    assert.equal(resolvePluginDataDir(), path.join(os.homedir(), ".local", "share", "codex-coach"));
  } finally {
    restoreDataDirEnv(env);
  }
});

test("resolvePluginDataDir honors environment data directory overrides", () => {
  const env = captureDataDirEnv();

  try {
    clearDataDirEnv();

    process.env[CODEX_COACH_DATA_DIR_ENV] = "/tmp/codex-coach-env";
    process.env.XDG_DATA_HOME = "/tmp/xdg-data-home";
    assert.equal(resolvePluginDataDir(), path.resolve("/tmp/codex-coach-env"));

    delete process.env[CODEX_COACH_DATA_DIR_ENV];
    assert.equal(resolvePluginDataDir(), path.resolve("/tmp/xdg-data-home/codex-coach"));
  } finally {
    restoreDataDirEnv(env);
  }
});

test("resolvePluginDataDir uses Codex memories when running inside the Codex sandbox", () => {
  const env = captureDataDirEnv();

  try {
    clearDataDirEnv();

    process.env.CODEX_SANDBOX = "seatbelt";
    process.env.CODEX_HOME = "/tmp/codex-home";
    assert.equal(resolvePluginDataDir(), path.resolve("/tmp/codex-home/memories/codex-coach"));

    delete process.env.CODEX_HOME;
    assert.equal(resolvePluginDataDir(), path.join(os.homedir(), ".codex", "memories", "codex-coach"));
  } finally {
    restoreDataDirEnv(env);
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

interface CapturedDataDirEnv {
  CODEX_COACH_DATA_DIR?: string;
  CODEX_HOME?: string;
  CODEX_SANDBOX?: string;
  XDG_DATA_HOME?: string;
}

function captureDataDirEnv(): CapturedDataDirEnv {
  return {
    CODEX_COACH_DATA_DIR: process.env[CODEX_COACH_DATA_DIR_ENV],
    CODEX_HOME: process.env.CODEX_HOME,
    CODEX_SANDBOX: process.env.CODEX_SANDBOX,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME
  };
}

function clearDataDirEnv(): void {
  delete process.env[CODEX_COACH_DATA_DIR_ENV];
  delete process.env.CODEX_HOME;
  delete process.env.CODEX_SANDBOX;
  delete process.env.XDG_DATA_HOME;
}

function restoreDataDirEnv(env: CapturedDataDirEnv): void {
  restoreEnvValue(CODEX_COACH_DATA_DIR_ENV, env.CODEX_COACH_DATA_DIR);
  restoreEnvValue("CODEX_HOME", env.CODEX_HOME);
  restoreEnvValue("CODEX_SANDBOX", env.CODEX_SANDBOX);
  restoreEnvValue("XDG_DATA_HOME", env.XDG_DATA_HOME);
}

function restoreEnvValue(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
