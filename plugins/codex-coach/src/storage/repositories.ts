import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";
import { SOURCE_LABELS, type SourceLabel, type SourceRef } from "../types/sources";
import type { CapabilityId } from "../capabilities/taxonomy";
import type {
  CapabilityEvent,
  CodexUpdate,
  HookObservation,
  LocalProfile,
  Recommendation,
  RecommendationFeedback,
  WorkItem
} from "../types/entities";
import { runMigrations, type SqlDatabase } from "./migrations";
import { ensurePluginDataDir, resolveDatabasePath } from "./paths";

export const DEFAULT_PROFILE_ID = "local-default";

export interface StorageCounts {
  codex_updates: number;
  capability_events: number;
  hook_observations: number;
  work_items: number;
  recommendations: number;
  recommendation_feedback: number;
}

export interface DemoSeedHooks {
  codexUpdates?: () => CodexUpdate[] | Promise<CodexUpdate[]>;
  capabilityEvents?: () => CapabilityEvent[] | Promise<CapabilityEvent[]>;
  hookObservations?: () => HookObservation[] | Promise<HookObservation[]>;
  workItems?: () => WorkItem[] | Promise<WorkItem[]>;
  recommendations?: () => Recommendation[] | Promise<Recommendation[]>;
  recommendationFeedback?: () => RecommendationFeedback[] | Promise<RecommendationFeedback[]>;
}

export interface DemoResetResult {
  profile: LocalProfile;
  seeded_records: Array<{
    entity: string;
    count: number;
  }>;
  last_seen_updates_at: string | null;
}

type SqlValue = initSqlJs.SqlValue;
type BindParams = initSqlJs.BindParams;
type Row = Record<string, SqlValue>;

let sqlJsPromise: Promise<initSqlJs.SqlJsStatic> | null = null;

export async function openStorage(input: { dataDir: string; generatedAt: string }): Promise<CodexCoachStorage> {
  const dataDir = path.resolve(input.dataDir);
  await ensurePluginDataDir(dataDir);

  const databasePath = resolveDatabasePath(dataDir);
  const SQL = await loadSqlJs();
  const existingBytes = await readExistingDatabase(databasePath);
  const db = existingBytes ? new SQL.Database(existingBytes) : new SQL.Database();

  runMigrations(db);

  const storage = new CodexCoachStorage({ dataDir, databasePath, db });
  storage.getOrCreateLocalProfile(input.generatedAt);
  return storage;
}

export class CodexCoachStorage {
  private readonly dataDir: string;
  private readonly databasePath: string;
  private readonly db: SqlDatabase;
  private closed = false;

  constructor(input: { dataDir: string; databasePath: string; db: SqlDatabase }) {
    this.dataDir = input.dataDir;
    this.databasePath = input.databasePath;
    this.db = input.db;
  }

  getDataDir(): string {
    return this.dataDir;
  }

  getDatabasePath(): string {
    return this.databasePath;
  }

  sourceRef(recordCount?: number): SourceRef {
    return {
      label: SOURCE_LABELS.LOCAL_IMPORT,
      description: "Local Codex Coach SQLite storage.",
      path: this.databasePath,
      record_count: recordCount
    };
  }

  getOrCreateLocalProfile(generatedAt: string): LocalProfile {
    const existing = this.getLocalProfile(DEFAULT_PROFILE_ID);
    if (existing) {
      return existing;
    }

    const profile: LocalProfile = {
      id: DEFAULT_PROFILE_ID,
      display_name: null,
      last_seen_updates_at: null,
      created_at: generatedAt
    };
    this.upsertLocalProfile(profile);
    return profile;
  }

  getLocalProfile(id = DEFAULT_PROFILE_ID): LocalProfile | null {
    const row = this.getRow("SELECT * FROM local_profiles WHERE id = ?", [id]);
    return row ? rowToLocalProfile(row) : null;
  }

  upsertLocalProfile(profile: LocalProfile): void {
    this.run(
      `
        INSERT INTO local_profiles (id, display_name, last_seen_updates_at, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          display_name = excluded.display_name,
          last_seen_updates_at = excluded.last_seen_updates_at
      `,
      [profile.id, profile.display_name, profile.last_seen_updates_at, profile.created_at]
    );
  }

  setLastSeenUpdatesAt(lastSeenUpdatesAt: string | null, generatedAt: string): LocalProfile {
    const profile = this.getOrCreateLocalProfile(generatedAt);
    const updated = { ...profile, last_seen_updates_at: lastSeenUpdatesAt };
    this.upsertLocalProfile(updated);
    return updated;
  }

  listCodexUpdates(): CodexUpdate[] {
    return this.queryRows("SELECT * FROM codex_updates ORDER BY published_at DESC, id ASC").map(rowToCodexUpdate);
  }

  upsertCodexUpdates(updates: CodexUpdate[]): number {
    for (const update of updates) {
      this.run(
        `
          INSERT INTO codex_updates (
            id,
            published_at,
            title,
            summary,
            source_url,
            capability_tags,
            update_topic_tags,
            imported_at,
            when_to_use
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            published_at = excluded.published_at,
            title = excluded.title,
            summary = excluded.summary,
            source_url = excluded.source_url,
            capability_tags = excluded.capability_tags,
            update_topic_tags = excluded.update_topic_tags,
            imported_at = excluded.imported_at,
            when_to_use = excluded.when_to_use
        `,
        [
          update.id,
          update.published_at,
          update.title,
          update.summary,
          update.source_url,
          stringifyJson(update.capability_tags),
          stringifyJson(update.update_topic_tags),
          update.imported_at,
          update.when_to_use
        ]
      );
    }

    return updates.length;
  }

  listCapabilityEvents(): CapabilityEvent[] {
    return this.queryRows("SELECT * FROM capability_events ORDER BY occurred_at DESC, id ASC").map(
      rowToCapabilityEvent
    );
  }

  upsertCapabilityEvents(events: CapabilityEvent[]): number {
    for (const event of events) {
      this.run(
        `
          INSERT INTO capability_events (id, user_id, capability, source, occurred_at, confidence, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            capability = excluded.capability,
            source = excluded.source,
            occurred_at = excluded.occurred_at,
            confidence = excluded.confidence,
            metadata = excluded.metadata
        `,
        [
          event.id,
          event.user_id,
          event.capability,
          event.source,
          event.occurred_at,
          event.confidence,
          stringifyJson(event.metadata)
        ]
      );
    }

    return events.length;
  }

  listHookObservations(): HookObservation[] {
    return this.queryRows("SELECT * FROM hook_observations ORDER BY observed_at DESC, id ASC").map(
      rowToHookObservation
    );
  }

  getLastHookObservationAt(): string | null {
    const row = this.getRow("SELECT observed_at FROM hook_observations ORDER BY observed_at DESC LIMIT 1");
    return readString(row?.observed_at);
  }

  upsertHookObservations(observations: HookObservation[]): number {
    for (const observation of observations) {
      this.run(
        `
          INSERT INTO hook_observations (
            id,
            session_id,
            turn_id,
            hook_event_name,
            tool_name,
            source,
            observed_at,
            capability_tags,
            metadata
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            session_id = excluded.session_id,
            turn_id = excluded.turn_id,
            hook_event_name = excluded.hook_event_name,
            tool_name = excluded.tool_name,
            source = excluded.source,
            observed_at = excluded.observed_at,
            capability_tags = excluded.capability_tags,
            metadata = excluded.metadata
        `,
        [
          observation.id,
          observation.session_id,
          observation.turn_id,
          observation.hook_event_name,
          observation.tool_name,
          observation.source,
          observation.observed_at,
          stringifyJson(observation.capability_tags),
          stringifyJson(observation.metadata)
        ]
      );
    }

    return observations.length;
  }

  listWorkItems(): WorkItem[] {
    return this.queryRows("SELECT * FROM work_items ORDER BY completed_at DESC, id ASC").map(rowToWorkItem);
  }

  upsertWorkItems(workItems: WorkItem[]): number {
    for (const workItem of workItems) {
      this.run(
        `
          INSERT INTO work_items (
            id,
            user_id,
            source,
            title,
            summary,
            completed_at,
            signals,
            artifact_url,
            repo_path
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            source = excluded.source,
            title = excluded.title,
            summary = excluded.summary,
            completed_at = excluded.completed_at,
            signals = excluded.signals,
            artifact_url = excluded.artifact_url,
            repo_path = excluded.repo_path
        `,
        [
          workItem.id,
          workItem.user_id,
          workItem.source,
          workItem.title,
          workItem.summary,
          workItem.completed_at,
          stringifyJson(workItem.signals),
          workItem.artifact_url,
          workItem.repo_path
        ]
      );
    }

    return workItems.length;
  }

  listRecommendations(): Recommendation[] {
    return this.queryRows("SELECT * FROM recommendations ORDER BY created_at DESC, id ASC").map(rowToRecommendation);
  }

  upsertRecommendations(recommendations: Recommendation[]): number {
    for (const recommendation of recommendations) {
      this.run(
        `
          INSERT INTO recommendations (
            id,
            user_id,
            work_item_id,
            capability,
            message,
            reason,
            status,
            created_at,
            work_item_source
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            work_item_id = excluded.work_item_id,
            capability = excluded.capability,
            message = excluded.message,
            reason = excluded.reason,
            status = excluded.status,
            created_at = excluded.created_at,
            work_item_source = excluded.work_item_source
        `,
        [
          recommendation.id,
          recommendation.user_id,
          recommendation.work_item_id,
          recommendation.capability,
          recommendation.message,
          recommendation.reason,
          recommendation.status,
          recommendation.created_at,
          recommendation.work_item_source
        ]
      );
    }

    return recommendations.length;
  }

  listRecommendationFeedback(): RecommendationFeedback[] {
    return this.queryRows("SELECT * FROM recommendation_feedback ORDER BY created_at DESC, id ASC").map(
      rowToRecommendationFeedback
    );
  }

  upsertRecommendationFeedback(feedbackItems: RecommendationFeedback[]): number {
    for (const feedback of feedbackItems) {
      this.run(
        `
          INSERT INTO recommendation_feedback (id, recommendation_id, rating, note, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            recommendation_id = excluded.recommendation_id,
            rating = excluded.rating,
            note = excluded.note,
            created_at = excluded.created_at
        `,
        [feedback.id, feedback.recommendation_id, feedback.rating, feedback.note, feedback.created_at]
      );
    }

    return feedbackItems.length;
  }

  getCounts(): StorageCounts {
    return {
      codex_updates: this.countTable("codex_updates"),
      capability_events: this.countTable("capability_events"),
      hook_observations: this.countTable("hook_observations"),
      work_items: this.countTable("work_items"),
      recommendations: this.countTable("recommendations"),
      recommendation_feedback: this.countTable("recommendation_feedback")
    };
  }

  async resetDemoState(input: {
    generatedAt: string;
    lastSeenUpdatesAt?: string | null;
    seedHooks?: DemoSeedHooks;
  }): Promise<DemoResetResult> {
    this.clearHistoryTables();

    const lastSeenUpdatesAt = input.lastSeenUpdatesAt ?? demoLastSeenUpdatesAt(input.generatedAt);
    const profile = this.setLastSeenUpdatesAt(lastSeenUpdatesAt, input.generatedAt);
    const hooks = input.seedHooks ?? {};
    const seededRecords = [
      {
        entity: "codex_updates",
        count: this.upsertCodexUpdates(await resolveSeed(hooks.codexUpdates))
      },
      {
        entity: "capability_events",
        count: this.upsertCapabilityEvents(await resolveSeed(hooks.capabilityEvents))
      },
      {
        entity: "hook_observations",
        count: this.upsertHookObservations(await resolveSeed(hooks.hookObservations))
      },
      {
        entity: "work_items",
        count: this.upsertWorkItems(await resolveSeed(hooks.workItems))
      },
      {
        entity: "recommendations",
        count: this.upsertRecommendations(await resolveSeed(hooks.recommendations))
      },
      {
        entity: "recommendation_feedback",
        count: this.upsertRecommendationFeedback(await resolveSeed(hooks.recommendationFeedback))
      }
    ];

    return {
      profile,
      seeded_records: seededRecords,
      last_seen_updates_at: profile.last_seen_updates_at
    };
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    await fs.writeFile(this.databasePath, Buffer.from(this.db.export()));
    this.db.close();
    this.closed = true;
  }

  private clearHistoryTables(): void {
    this.db.run(`
      DELETE FROM recommendation_feedback;
      DELETE FROM recommendations;
      DELETE FROM work_items;
      DELETE FROM hook_observations;
      DELETE FROM capability_events;
      DELETE FROM codex_updates;
    `);
  }

  private countTable(tableName: string): number {
    const row = this.getRow(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return readNumber(row?.count) ?? 0;
  }

  private getRow(sql: string, params?: BindParams): Row | null {
    return this.queryRows(sql, params)[0] ?? null;
  }

  private queryRows(sql: string, params?: BindParams): Row[] {
    const statement = this.db.prepare(sql);
    const rows: Row[] = [];

    try {
      if (params) {
        statement.bind(params);
      }

      while (statement.step()) {
        rows.push(statement.getAsObject() as Row);
      }
    } finally {
      statement.free();
    }

    return rows;
  }

  private run(sql: string, params?: BindParams): void {
    this.db.run(sql, params);
  }
}

function loadSqlJs(): Promise<initSqlJs.SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({
    locateFile: (fileName: string) =>
      fileName.endsWith(".wasm") ? require.resolve("sql.js/dist/sql-wasm.wasm") : fileName
  });

  return sqlJsPromise;
}

async function readExistingDatabase(databasePath: string): Promise<Uint8Array | null> {
  try {
    return await fs.readFile(databasePath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function demoLastSeenUpdatesAt(generatedAt: string): string {
  const generatedDate = new Date(generatedAt);
  const baseTime = Number.isNaN(generatedDate.getTime()) ? Date.now() : generatedDate.getTime();
  return new Date(baseTime - 7 * 24 * 60 * 60 * 1000).toISOString();
}

async function resolveSeed<T>(seed?: () => T[] | Promise<T[]>): Promise<T[]> {
  return seed ? seed() : [];
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function parseJsonArray<T>(value: SqlValue): T[] {
  if (typeof value !== "string") {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function parseJsonObject(value: SqlValue): Record<string, unknown> {
  if (typeof value !== "string") {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}

function rowToLocalProfile(row: Row): LocalProfile {
  return {
    id: requireString(row.id),
    display_name: readString(row.display_name),
    last_seen_updates_at: readString(row.last_seen_updates_at),
    created_at: requireString(row.created_at)
  };
}

function rowToCodexUpdate(row: Row): CodexUpdate {
  return {
    id: requireString(row.id),
    published_at: requireString(row.published_at),
    title: requireString(row.title),
    summary: requireString(row.summary),
    source_url: requireString(row.source_url),
    capability_tags: parseJsonArray<CapabilityId>(row.capability_tags),
    update_topic_tags: parseJsonArray<string>(row.update_topic_tags),
    imported_at: requireString(row.imported_at),
    when_to_use: requireString(row.when_to_use)
  };
}

function rowToCapabilityEvent(row: Row): CapabilityEvent {
  return {
    id: requireString(row.id),
    user_id: requireString(row.user_id),
    capability: requireString(row.capability) as CapabilityId,
    source: requireString(row.source) as SourceLabel,
    occurred_at: requireString(row.occurred_at),
    confidence: requireNumber(row.confidence),
    metadata: parseJsonObject(row.metadata)
  };
}

function rowToHookObservation(row: Row): HookObservation {
  return {
    id: requireString(row.id),
    session_id: readString(row.session_id),
    turn_id: readString(row.turn_id),
    hook_event_name: requireString(row.hook_event_name),
    tool_name: readString(row.tool_name),
    source: requireString(row.source) as SourceLabel,
    observed_at: requireString(row.observed_at),
    capability_tags: parseJsonArray<CapabilityId>(row.capability_tags),
    metadata: parseJsonObject(row.metadata)
  };
}

function rowToWorkItem(row: Row): WorkItem {
  return {
    id: requireString(row.id),
    user_id: requireString(row.user_id),
    source: requireString(row.source) as SourceLabel,
    title: requireString(row.title),
    summary: requireString(row.summary),
    completed_at: requireString(row.completed_at),
    signals: parseJsonObject(row.signals),
    artifact_url: readString(row.artifact_url),
    repo_path: readString(row.repo_path)
  };
}

function rowToRecommendation(row: Row): Recommendation {
  return {
    id: requireString(row.id),
    user_id: requireString(row.user_id),
    work_item_id: requireString(row.work_item_id),
    capability: requireString(row.capability) as CapabilityId,
    message: requireString(row.message),
    reason: requireString(row.reason),
    status: requireString(row.status) as Recommendation["status"],
    created_at: requireString(row.created_at),
    work_item_source: requireString(row.work_item_source) as SourceLabel
  };
}

function rowToRecommendationFeedback(row: Row): RecommendationFeedback {
  return {
    id: requireString(row.id),
    recommendation_id: requireString(row.recommendation_id),
    rating: requireString(row.rating) as RecommendationFeedback["rating"],
    note: readString(row.note),
    created_at: requireString(row.created_at)
  };
}

function requireString(value: SqlValue): string {
  if (typeof value !== "string") {
    throw new TypeError("Expected SQLite TEXT value.");
  }

  return value;
}

function readString(value: SqlValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function requireNumber(value: SqlValue): number {
  const number = readNumber(value);
  if (number === null) {
    throw new TypeError("Expected SQLite numeric value.");
  }

  return number;
}

function readNumber(value: SqlValue | undefined): number | null {
  return typeof value === "number" ? value : null;
}
