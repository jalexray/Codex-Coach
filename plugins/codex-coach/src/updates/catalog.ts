import fs from "node:fs/promises";
import path from "node:path";
import { CoachError } from "../lib/errors";
import { isCapabilityId } from "../capabilities/taxonomy";
import type { CodexUpdate } from "../types/entities";

export const CODEX_CHANGELOG_URL = "https://developers.openai.com/codex/changelog";
export const BUNDLED_CHANGELOG_PATH = path.resolve(__dirname, "..", "..", "data", "codex-updates.json");
export const CHANGELOG_CACHE_SCHEMA_VERSION = 1;

interface ChangelogCacheFile {
  schema_version: number;
  source_url?: string;
  cached_at?: string;
  updates: unknown;
}

export async function loadBundledUpdates(): Promise<CodexUpdate[]> {
  const cacheFile = await readChangelogCacheFile(BUNDLED_CHANGELOG_PATH, "bundled changelog cache");
  return sortUpdatesNewestFirst(validateCacheFile(cacheFile, "bundled changelog cache"));
}

export async function readChangelogCacheFile(filePath: string, context: string): Promise<ChangelogCacheFile> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error, "ENOENT")) {
      throw new CoachError("changelog_cache_missing", `Missing ${context}.`, { path: filePath });
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CoachError("changelog_cache_invalid", `Invalid JSON in ${context}.`, {
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  if (!isRecord(parsed)) {
    throw new CoachError("changelog_cache_invalid", `Invalid ${context}: expected an object.`, { path: filePath });
  }

  return parsed as unknown as ChangelogCacheFile;
}

export function validateCacheFile(cacheFile: ChangelogCacheFile, context: string): CodexUpdate[] {
  if (cacheFile.schema_version !== CHANGELOG_CACHE_SCHEMA_VERSION) {
    throw new CoachError("changelog_cache_invalid", `Invalid ${context}: unsupported schema version.`, {
      schema_version: cacheFile.schema_version,
      expected_schema_version: CHANGELOG_CACHE_SCHEMA_VERSION
    });
  }

  if (!Array.isArray(cacheFile.updates)) {
    throw new CoachError("changelog_cache_invalid", `Invalid ${context}: updates must be an array.`);
  }

  return validateUpdates(cacheFile.updates, context);
}

export function validateUpdates(values: unknown[], context: string): CodexUpdate[] {
  const seenIds = new Set<string>();
  return values.map((value, index) => {
    const update = validateUpdate(value, index, context);
    if (seenIds.has(update.id)) {
      throw new CoachError("changelog_cache_invalid", `Invalid ${context}: duplicate update id.`, {
        id: update.id
      });
    }
    seenIds.add(update.id);
    return update;
  });
}

export function sortUpdatesNewestFirst(updates: CodexUpdate[]): CodexUpdate[] {
  return [...updates].sort((left, right) => {
    const dateCompare = right.published_at.localeCompare(left.published_at);
    return dateCompare === 0 ? right.id.localeCompare(left.id) : dateCompare;
  });
}

export function toChangelogCacheFile(updates: CodexUpdate[], cachedAt: string): ChangelogCacheFile {
  return {
    schema_version: CHANGELOG_CACHE_SCHEMA_VERSION,
    source_url: CODEX_CHANGELOG_URL,
    cached_at: cachedAt,
    updates: sortUpdatesNewestFirst(updates)
  };
}

function validateUpdate(value: unknown, index: number, context: string): CodexUpdate {
  if (!isRecord(value)) {
    throw invalidUpdate(context, index, "expected an object");
  }

  const id = readString(value, "id", context, index);
  const publishedAt = readString(value, "published_at", context, index);
  const title = readString(value, "title", context, index);
  const summary = readString(value, "summary", context, index);
  const sourceUrl = readString(value, "source_url", context, index);
  const capabilityTags = readStringArray(value, "capability_tags", context, index);
  const updateTopicTags = readStringArray(value, "update_topic_tags", context, index);
  const importedAt = readString(value, "imported_at", context, index);
  const whenToUse = readString(value, "when_to_use", context, index);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) || Number.isNaN(Date.parse(`${publishedAt}T00:00:00.000Z`))) {
    throw invalidUpdate(context, index, "published_at must be a YYYY-MM-DD date", { id, published_at: publishedAt });
  }

  if (Number.isNaN(Date.parse(importedAt))) {
    throw invalidUpdate(context, index, "imported_at must be an ISO timestamp", { id, imported_at: importedAt });
  }

  if (!sourceUrl.startsWith(`${CODEX_CHANGELOG_URL}#codex-`)) {
    throw invalidUpdate(context, index, "source_url must point to the official Codex changelog anchor", {
      id,
      source_url: sourceUrl
    });
  }

  if (capabilityTags.length === 0) {
    throw invalidUpdate(context, index, "capability_tags must contain at least one canonical capability id", { id });
  }

  const unknownCapabilityTags = capabilityTags.filter((tag) => !isCapabilityId(tag));
  if (unknownCapabilityTags.length > 0) {
    throw invalidUpdate(context, index, "capability_tags contains unknown canonical ids", {
      id,
      unknown_capability_tags: unknownCapabilityTags
    });
  }

  return {
    id,
    published_at: publishedAt,
    title,
    summary,
    source_url: sourceUrl,
    capability_tags: capabilityTags.filter(isCapabilityId),
    update_topic_tags: updateTopicTags,
    imported_at: importedAt,
    when_to_use: whenToUse
  };
}

function readString(record: Record<string, unknown>, field: string, context: string, index: number): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw invalidUpdate(context, index, `${field} must be a non-empty string`);
  }
  return value;
}

function readStringArray(record: Record<string, unknown>, field: string, context: string, index: number): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw invalidUpdate(context, index, `${field} must be an array of non-empty strings`);
  }
  return value;
}

function invalidUpdate(
  context: string,
  index: number,
  message: string,
  details: Record<string, unknown> = {}
): CoachError {
  return new CoachError("changelog_cache_invalid", `Invalid ${context} update at index ${index}: ${message}.`, {
    index,
    ...details
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
