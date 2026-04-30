import type initSqlJs from "sql.js";
import { CoachError } from "../lib/errors";

export const SCHEMA_VERSION = 1;

export type SqlDatabase = initSqlJs.Database;

export function runMigrations(db: SqlDatabase): void {
  db.run("PRAGMA foreign_keys = ON");

  const currentVersion = getUserVersion(db);
  if (currentVersion > SCHEMA_VERSION) {
    throw new CoachError(
      "storage_schema_too_new",
      "The local Codex Coach storage schema is newer than this CLI supports.",
      { current_version: currentVersion, supported_version: SCHEMA_VERSION }
    );
  }

  if (currentVersion === 0) {
    applyInitialSchema(db);
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

function getUserVersion(db: SqlDatabase): number {
  const rows = db.exec("PRAGMA user_version");
  const value = rows[0]?.values[0]?.[0];

  return typeof value === "number" ? value : 0;
}

function applyInitialSchema(db: SqlDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS local_profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      last_seen_updates_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codex_updates (
      id TEXT PRIMARY KEY,
      published_at TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_url TEXT NOT NULL,
      capability_tags TEXT NOT NULL,
      update_topic_tags TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      when_to_use TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capability_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      source TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      confidence REAL NOT NULL,
      metadata TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES local_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hook_observations (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      turn_id TEXT,
      hook_event_name TEXT NOT NULL,
      tool_name TEXT,
      source TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      capability_tags TEXT NOT NULL,
      metadata TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      signals TEXT NOT NULL,
      artifact_url TEXT,
      repo_path TEXT,
      FOREIGN KEY (user_id) REFERENCES local_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_item_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      message TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      work_item_source TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES local_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recommendation_feedback (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT NOT NULL,
      rating TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_codex_updates_published_at ON codex_updates(published_at);
    CREATE INDEX IF NOT EXISTS idx_capability_events_capability ON capability_events(capability);
    CREATE INDEX IF NOT EXISTS idx_capability_events_occurred_at ON capability_events(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_hook_observations_observed_at ON hook_observations(observed_at);
    CREATE INDEX IF NOT EXISTS idx_work_items_completed_at ON work_items(completed_at);
    CREATE INDEX IF NOT EXISTS idx_recommendations_work_item_id ON recommendations(work_item_id);
    CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_recommendation_id
      ON recommendation_feedback(recommendation_id);
  `);
}
