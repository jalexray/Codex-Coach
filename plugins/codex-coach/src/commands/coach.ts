import { Command } from "commander";
import { getCapabilityMapResult } from "../capabilities";
import { getRecommendations, recommendationSources } from "../recommender/service";
import { openStorage } from "../storage";
import { getUpdates } from "../updates";
import { getRecentWorkResult } from "../work-items";
import { addGlobalOptions, runCommand } from "./runner";
import type {
  CapabilityMapData,
  CoachData,
  GetRecentWorkData,
  GetRecommendationsData,
  GetUpdatesData
} from "../types/command-data";
import type { CommandContext, CommandResult } from "../types/commands";
import type { LocalProfile } from "../types/entities";
import type { SourceRef } from "../types/sources";

interface CoachResultParts {
  updates: CommandResult<GetUpdatesData>;
  capabilityMap: CommandResult<CapabilityMapData>;
  recentWork: CommandResult<GetRecentWorkData>;
  recommendations: CommandResult<GetRecommendationsData>;
  profile: CommandResult<LocalProfile>;
}

export function registerCoachCommands(program: Command): void {
  const command = addGlobalOptions(program.command("coach").description("Return the default Codex Coach readout payload."));

  command.action(async () => {
    await runCommand<CoachData>("coach", command, getCoachResult);
  });
}

export async function getCoachResult(ctx: CommandContext): Promise<CommandResult<CoachData>> {
  const updates = await getUpdates(ctx);
  const capabilityMap = await getCapabilityMapResult(ctx);
  const recentWork = await getRecentWorkResult(ctx);
  const recommendationsData = await getRecommendations(ctx);
  const recommendations: CommandResult<GetRecommendationsData> = {
    data: recommendationsData,
    sources: recommendationSources(ctx, recommendationsData)
  };
  const profile = await getProfileResult(ctx);

  return composeCoachResult({
    updates,
    capabilityMap,
    recentWork,
    recommendations,
    profile
  });
}

export function composeCoachResult(parts: CoachResultParts): CommandResult<CoachData> {
  return {
    data: {
      updates: normalizeUpdates(parts.updates.data),
      capability_map: normalizeCapabilityMap(parts.capabilityMap.data),
      recent_work: normalizeRecentWork(parts.recentWork.data),
      recommendations: normalizeRecommendations(parts.recommendations.data),
      profile: parts.profile.data
    },
    warnings: dedupeStrings([
      ...(parts.updates.warnings ?? []),
      ...(parts.capabilityMap.warnings ?? []),
      ...(parts.recentWork.warnings ?? []),
      ...(parts.recommendations.warnings ?? []),
      ...(parts.profile.warnings ?? [])
    ]),
    sources: dedupeSources([
      ...(parts.updates.sources ?? []),
      ...(parts.capabilityMap.sources ?? []),
      ...(parts.recentWork.sources ?? []),
      ...(parts.recommendations.sources ?? []),
      ...(parts.profile.sources ?? [])
    ])
  };
}

async function getProfileResult(ctx: CommandContext): Promise<CommandResult<LocalProfile>> {
  const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

  try {
    return {
      data: storage.getOrCreateLocalProfile(ctx.generated_at),
      sources: [storage.sourceRef()]
    };
  } finally {
    await storage.close();
  }
}

function normalizeUpdates(data: GetUpdatesData): GetUpdatesData {
  return {
    ...data,
    updates: data.updates ?? [],
    recent_highlights: data.recent_highlights ?? []
  };
}

function normalizeCapabilityMap(data: CapabilityMapData): CapabilityMapData {
  return {
    ...data,
    groups: (data.groups ?? []).map((group) => ({
      ...group,
      capabilities: (group.capabilities ?? []).map((capability) => ({
        ...capability,
        sources: capability.sources ?? []
      }))
    }))
  };
}

function normalizeRecentWork(data: GetRecentWorkData): GetRecentWorkData {
  return {
    ...data,
    work_items: data.work_items ?? []
  };
}

function normalizeRecommendations(data: GetRecommendationsData): GetRecommendationsData {
  return {
    ...data,
    recommendations: data.recommendations ?? []
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    deduped.push(value);
  }

  return deduped;
}

function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const deduped: SourceRef[] = [];

  for (const source of sources) {
    const key = sourceKey(source);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}

function sourceKey(source: SourceRef): string {
  return [
    source.label,
    source.description,
    source.path ?? "",
    source.url ?? "",
    source.record_count ?? ""
  ].join("\0");
}
