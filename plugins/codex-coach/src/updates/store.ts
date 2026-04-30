import fs from "node:fs/promises";
import path from "node:path";
import {
  CODEX_CHANGELOG_URL,
  readChangelogCacheFile,
  sortUpdatesNewestFirst,
  toChangelogCacheFile,
  validateCacheFile
} from "./catalog";
import type { CodexUpdate } from "../types/entities";
import type { SourceRef } from "../types/sources";
import { SOURCE_LABELS } from "../types/sources";

const LOCAL_CACHE_FILE_NAME = "codex-updates.json";

export interface StoredUpdates {
  cache_path: string;
  updates: CodexUpdate[];
}

export function localCachePath(dataDir: string): string {
  return path.join(dataDir, LOCAL_CACHE_FILE_NAME);
}

export async function readLocalUpdates(dataDir: string): Promise<StoredUpdates | null> {
  const cachePath = localCachePath(dataDir);
  try {
    const cacheFile = await readChangelogCacheFile(cachePath, "local changelog cache");
    return {
      cache_path: cachePath,
      updates: sortUpdatesNewestFirst(validateCacheFile(cacheFile, "local changelog cache"))
    };
  } catch (error) {
    if (isNodeError(error, "ENOENT") || isCoachCacheMissing(error)) {
      return null;
    }
    throw error;
  }
}

export async function writeLocalUpdates(dataDir: string, updates: CodexUpdate[], generatedAt: string): Promise<StoredUpdates> {
  await fs.mkdir(dataDir, { recursive: true });
  const sortedUpdates = sortUpdatesNewestFirst(updates);
  const cachePath = localCachePath(dataDir);
  await fs.writeFile(cachePath, `${JSON.stringify(toChangelogCacheFile(sortedUpdates, generatedAt), null, 2)}\n`, "utf8");

  return {
    cache_path: cachePath,
    updates: sortedUpdates
  };
}

export function updateSources(cachePath: string, count: number): SourceRef[] {
  return [
    {
      label: SOURCE_LABELS.CODEX_CHANGELOG,
      description: "Official Codex changelog.",
      url: CODEX_CHANGELOG_URL,
      record_count: count
    },
    {
      label: SOURCE_LABELS.LOCAL_IMPORT,
      description: "Local Codex Coach changelog cache.",
      path: cachePath,
      record_count: count
    }
  ];
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function isCoachCacheMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as { code?: unknown }).code === "changelog_cache_missing";
}
