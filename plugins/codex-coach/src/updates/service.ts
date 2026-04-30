import { BUNDLED_CHANGELOG_PATH, loadBundledUpdates, sortUpdatesNewestFirst } from "./catalog";
import { getOrCreateProfile, profilePath, saveProfile, validateSeenAt } from "./profile";
import { localCachePath, readLocalUpdates, updateSources, writeLocalUpdates } from "./store";
import type { GetUpdatesData, ImportChangelogData, ResetDemoStateData } from "../types/command-data";
import type { CommandContext, CommandResult } from "../types/commands";
import type { CodexUpdate, LocalProfile } from "../types/entities";
import { SOURCE_LABELS } from "../types/sources";

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
  const existing = await readLocalUpdates(ctx.data_dir);
  const existingById = new Map((existing?.updates ?? []).map((update) => [update.id, update]));
  const mergedById = new Map((existing?.updates ?? []).map((update) => [update.id, update]));

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

  const stored = await writeLocalUpdates(ctx.data_dir, [...mergedById.values()], ctx.generated_at);

  return {
    data: {
      imported_count: importedCount,
      skipped_count: skippedCount,
      refreshed: false,
      cache_path: stored.cache_path,
      updates: stored.updates
    },
    warnings,
    sources: [
      {
        label: SOURCE_LABELS.CODEX_CHANGELOG,
        description: "Official Codex changelog.",
        url: "https://developers.openai.com/codex/changelog",
        record_count: bundledUpdates.length
      },
      {
        label: SOURCE_LABELS.LOCAL_IMPORT,
        description: "Bundled offline Codex changelog cache.",
        path: BUNDLED_CHANGELOG_PATH,
        record_count: bundledUpdates.length
      }
    ]
  };
}

export async function getUpdates(ctx: CommandContext): Promise<CommandResult<GetUpdatesData>> {
  const stored = await ensureLocalUpdateCache(ctx);
  const profile = await getOrCreateProfile(ctx.data_dir, ctx.generated_at);
  const allUpdates = sortUpdatesNewestFirst(stored.updates);
  const lastSeenUpdatesAt = profile.last_seen_updates_at;

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
    sources: updateSources(stored.cache_path, allUpdates.length)
  };
}

export async function markUpdatesSeen(ctx: CommandContext, seenAt?: string): Promise<CommandResult<LocalProfile>> {
  const profile = await getOrCreateProfile(ctx.data_dir, ctx.generated_at);
  const lastSeenUpdatesAt = validateSeenAt(seenAt ?? ctx.generated_at);
  const updatedProfile = await saveProfile(ctx.data_dir, {
    ...profile,
    last_seen_updates_at: lastSeenUpdatesAt
  });

  return {
    data: updatedProfile,
    warnings: [],
    sources: [
      {
        label: SOURCE_LABELS.LOCAL_IMPORT,
        description: "Local Codex Coach profile state.",
        path: profilePath(ctx.data_dir),
        record_count: 1
      }
    ]
  };
}

export async function resetUpdateDemoState(ctx: CommandContext): Promise<CommandResult<ResetDemoStateData>> {
  const stored = await ensureLocalUpdateCache(ctx);
  const existingProfile = await getOrCreateProfile(ctx.data_dir, ctx.generated_at);
  const profile = await saveProfile(ctx.data_dir, {
    ...existingProfile,
    last_seen_updates_at: DEMO_LAST_SEEN_UPDATES_AT
  });

  return {
    data: {
      profile,
      seeded_records: [
        {
          entity: "codex_updates",
          count: stored.updates.length
        }
      ],
      last_seen_updates_at: profile.last_seen_updates_at
    },
    warnings: [],
    sources: updateSources(stored.cache_path, stored.updates.length)
  };
}

async function ensureLocalUpdateCache(ctx: CommandContext): Promise<{ cache_path: string; updates: CodexUpdate[] }> {
  const existing = await readLocalUpdates(ctx.data_dir);
  if (existing) {
    return existing;
  }

  const bundledUpdates = await loadBundledUpdates();
  return writeLocalUpdates(ctx.data_dir, bundledUpdates, ctx.generated_at);
}

function updatesAfter(updates: CodexUpdate[], lastSeenUpdatesAt: string): CodexUpdate[] {
  const lastSeenTime = Date.parse(lastSeenUpdatesAt);
  return updates.filter((update) => Date.parse(`${update.published_at}T00:00:00.000Z`) > lastSeenTime);
}

function updatesEqual(left: CodexUpdate, right: CodexUpdate): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function updateCachePath(dataDir: string): string {
  return localCachePath(dataDir);
}
