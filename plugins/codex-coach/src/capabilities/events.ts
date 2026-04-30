import fs from "node:fs/promises";
import path from "node:path";
import { isCapabilityId } from "./taxonomy";
import { openStorage } from "../storage";
import { SOURCE_LABELS, type SourceLabel } from "../types/sources";
import type { CommandContext } from "../types/commands";
import type { CapabilityEvent } from "../types/entities";

export const CAPABILITY_EVENTS_FILE = "capability-events.json";

const READABLE_CAPABILITY_EVENT_FILES = [
  CAPABILITY_EVENTS_FILE,
  "capability_events.json",
  "capability-events.ndjson",
  "capability_events.ndjson",
  "capability-events.jsonl",
  "capability_events.jsonl"
] as const;

const SOURCE_LABEL_SET = new Set<string>(Object.values(SOURCE_LABELS));

export interface CapabilityEventLoadResult {
  events: CapabilityEvent[];
  source_paths: string[];
  skipped_records: number;
  warnings: string[];
}

export async function loadCapabilityEvents(
  ctx: Pick<CommandContext, "data_dir">
): Promise<CapabilityEventLoadResult> {
  const eventsById = new Map<string, CapabilityEvent>();
  const sourcePaths: string[] = [];
  const warnings: string[] = [];
  let skippedRecords = 0;

  try {
    const storage = await openStorage({
      dataDir: ctx.data_dir,
      generatedAt: "1970-01-01T00:00:00.000Z"
    });

    try {
      for (const event of storage.listCapabilityEvents()) {
        eventsById.set(event.id, event);
      }
      sourcePaths.push(storage.getDatabasePath());
    } finally {
      await storage.close();
    }
  } catch {
    warnings.push("capability_events_storage_unreadable");
  }

  for (const fileName of READABLE_CAPABILITY_EVENT_FILES) {
    const filePath = path.join(ctx.data_dir, fileName);
    let raw: string;

    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        continue;
      }

      warnings.push(`capability_events_unreadable:${fileName}`);
      continue;
    }

    sourcePaths.push(filePath);

    let records: unknown[];
    try {
      records = fileName.endsWith(".ndjson") || fileName.endsWith(".jsonl") ? parseNdjson(raw) : parseJsonRecords(raw);
    } catch {
      warnings.push(`capability_events_parse_failed:${fileName}`);
      continue;
    }

    for (const record of records) {
      const event = normalizeCapabilityEvent(record);
      if (!event) {
        skippedRecords += 1;
        continue;
      }

      eventsById.set(event.id, event);
    }
  }

  if (skippedRecords > 0) {
    warnings.push(`capability_event_records_skipped:${skippedRecords}`);
  }

  return {
    events: [...eventsById.values()],
    source_paths: sourcePaths,
    skipped_records: skippedRecords,
    warnings
  };
}

export async function recordCapabilityEvents(
  ctx: Pick<CommandContext, "data_dir">,
  events: ReadonlyArray<CapabilityEvent>
): Promise<void> {
  const normalizedEvents = events.map((event) => {
    const normalized = normalizeCapabilityEvent(event);
    if (!normalized) {
      throw new Error("Invalid capability event.");
    }
    return normalized;
  });

  const existing = await loadCapabilityEvents(ctx);
  const eventsById = new Map<string, CapabilityEvent>();
  for (const event of existing.events) {
    eventsById.set(event.id, event);
  }
  for (const event of normalizedEvents) {
    eventsById.set(event.id, event);
  }

  await fs.mkdir(ctx.data_dir, { recursive: true });
  await fs.writeFile(
    path.join(ctx.data_dir, CAPABILITY_EVENTS_FILE),
    `${JSON.stringify({ capability_events: [...eventsById.values()] }, null, 2)}\n`,
    "utf8"
  );
}

function parseJsonRecords(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!isRecord(parsed)) {
    return [];
  }

  const capabilityEvents = parsed.capability_events;
  if (Array.isArray(capabilityEvents)) {
    return capabilityEvents;
  }

  const records = parsed.records;
  if (Array.isArray(records)) {
    return records;
  }

  return [];
}

function parseNdjson(raw: string): unknown[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

function normalizeCapabilityEvent(value: unknown): CapabilityEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.capability)) {
    return null;
  }

  if (!isCapabilityId(value.capability)) {
    return null;
  }

  if (!isNonEmptyString(value.source) || !isSourceLabel(value.source)) {
    return null;
  }

  if (!isNonEmptyString(value.occurred_at) || Number.isNaN(Date.parse(value.occurred_at))) {
    return null;
  }

  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence)) {
    return null;
  }

  const userId = isNonEmptyString(value.user_id) ? value.user_id : "local-default";
  const metadata = isRecord(value.metadata) ? value.metadata : {};

  return {
    id: value.id,
    user_id: userId,
    capability: value.capability,
    source: value.source,
    occurred_at: new Date(value.occurred_at).toISOString(),
    confidence: clampConfidence(value.confidence),
    metadata
  };
}

function isSourceLabel(value: string): value is SourceLabel {
  return SOURCE_LABEL_SET.has(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
