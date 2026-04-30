import { BUNDLED_CHANGELOG_PATH, CODEX_CHANGELOG_URL, loadBundledUpdates, sortUpdatesNewestFirst } from "./catalog";
import { CoachError } from "../lib/errors";
import { openStorage, type CodexCoachStorage } from "../storage";
import type { GetUpdatesData, ImportChangelogData, ResetDemoStateData } from "../types/command-data";
import type { CommandContext, CommandResult } from "../types/commands";
import type { CodexUpdate, LocalProfile } from "../types/entities";
import { SOURCE_LABELS, type SourceRef } from "../types/sources";

const RECENT_HIGHLIGHT_LIMIT = 3;
const DEMO_LAST_SEEN_UPDATES_AT = "2026-03-24T00:00:00.000Z";

export interface ImportChangelogOptions {
  refresh?: boolean;
}

export async function importChangelog(
  ctx: CommandContext,
  options: ImportChangelogOptions = {}
): Promise<CommandResult<ImportChangelogData>> {
  const warnings: string[] = [];
  if (options.refresh) {
    warnings.push("refresh_not_enabled: using the bundled offline Codex changelog cache.");
  }

  const bundledUpdates = await loadBundledUpdates();
  const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

  try {
    const existingUpdates = storage.listCodexUpdates();
    const existingById = new Map(existingUpdates.map((update) => [update.id, update]));
    const mergedById = new Map(existingUpdates.map((update) => [update.id, update]));

    let importedCount = 0;
    let skippedCount = 0;

    for (const update of bundledUpdates) {
      const existingUpdate = existingById.get(update.id);
      if (existingUpdate && updatesEqual(existingUpdate, update)) {
        skippedCount += 1;
      } else {
        importedCount += 1;
      }
      mergedById.set(update.id, update);
    }

    storage.upsertCodexUpdates([...mergedById.values()]);
    const storedUpdates = sortUpdatesNewestFirst(storage.listCodexUpdates());

    return {
      data: {
        imported_count: importedCount,
        skipped_count: skippedCount,
        refreshed: false,
        cache_path: storage.getDatabasePath(),
        updates: storedUpdates
      },
      warnings,
      sources: updateSources(storage, bundledUpdates.length, storedUpdates.length)
    };
  } finally {
    await storage.close();
  }
}

export async function getUpdates(ctx: CommandContext): Promise<CommandResult<GetUpdatesData>> {
  const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

  try {
    const allUpdates = await ensureStoredUpdates(storage);
    const profile = storage.getOrCreateLocalProfile(ctx.generated_at);
    const lastSeenUpdatesAt = ctx.demo ? DEMO_LAST_SEEN_UPDATES_AT : profile.last_seen_updates_at;

    const data: GetUpdatesData =
      lastSeenUpdatesAt === null
        ? {
            last_seen_updates_at: null,
            mode: "new-user",
            updates: [],
            recent_highlights: allUpdates.slice(0, RECENT_HIGHLIGHT_LIMIT),
            next_mark_seen_at: ctx.generated_at
          }
        : {
            last_seen_updates_at: lastSeenUpdatesAt,
            mode: "delta",
            updates: updatesAfter(allUpdates, lastSeenUpdatesAt),
            recent_highlights: [],
            next_mark_seen_at: ctx.generated_at
          };

    return {
      data,
      warnings: [],
      sources: updateSources(storage, allUpdates.length, allUpdates.length)
    };
  } finally {
    await storage.close();
  }
}

export async function markUpdatesSeen(ctx: CommandContext, seenAt?: string): Promise<CommandResult<LocalProfile>> {
  const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

  try {
    const lastSeenUpdatesAt = validateSeenAt(seenAt ?? ctx.generated_at);
    const updatedProfile = storage.setLastSeenUpdatesAt(lastSeenUpdatesAt, ctx.generated_at);

    return {
      data: updatedProfile,
      warnings: [],
      sources: [storage.sourceRef(1)]
    };
  } finally {
    await storage.close();
  }
}

export async function resetUpdateDemoState(ctx: CommandContext): Promise<CommandResult<ResetDemoStateData>> {
  const bundledUpdates = await loadBundledUpdates();
  const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

  try {
    const data = await storage.resetDemoState({
      generatedAt: ctx.generated_at,
      lastSeenUpdatesAt: DEMO_LAST_SEEN_UPDATES_AT,
      seedHooks: {
        codexUpdates: () => bundledUpdates
      }
    });

    return {
      data,
      warnings: [],
      sources: updateSources(storage, bundledUpdates.length, storage.getCounts().codex_updates)
    };
  } finally {
    await storage.close();
  }
}

async function ensureStoredUpdates(storage: CodexCoachStorage): Promise<CodexUpdate[]> {
  const existing = sortUpdatesNewestFirst(storage.listCodexUpdates());
  if (existing.length > 0) {
    return existing;
  }

  const bundledUpdates = await loadBundledUpdates();
  storage.upsertCodexUpdates(bundledUpdates);
  return sortUpdatesNewestFirst(storage.listCodexUpdates());
}

function updatesAfter(updates: CodexUpdate[], lastSeenUpdatesAt: string): CodexUpdate[] {
  const lastSeenTime = Date.parse(lastSeenUpdatesAt);
  return updates.filter((update) => Date.parse(`${update.published_at}T00:00:00.000Z`) > lastSeenTime);
}

function updatesEqual(left: CodexUpdate, right: CodexUpdate): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function updateSources(storage: CodexCoachStorage, bundledCount: number, storageCount: number): SourceRef[] {
  return [
    {
      label: SOURCE_LABELS.CODEX_CHANGELOG,
      description: "Official Codex changelog.",
      url: CODEX_CHANGELOG_URL,
      record_count: bundledCount
    },
    {
      label: SOURCE_LABELS.LOCAL_IMPORT,
      description: "Bundled offline Codex changelog cache.",
      path: BUNDLED_CHANGELOG_PATH,
      record_count: bundledCount
    },
    storage.sourceRef(storageCount)
  ];
}

function validateSeenAt(value: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new CoachError("invalid_input", "seen-at must be an ISO-compatible timestamp.", { seen_at: value }, 2);
  }
  return new Date(value).toISOString();
}
