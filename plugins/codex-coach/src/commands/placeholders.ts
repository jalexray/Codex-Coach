import path from "node:path";
import {
  CAPABILITY_GROUPS,
  CAPABILITY_TAXONOMY,
  getCapability,
  type CapabilityId
} from "../capabilities/taxonomy";
import type {
  CapabilityMapData,
  CoachData,
  DeleteLocalHistoryData,
  GetRecentWorkData,
  GetRecommendationsData,
  GetUpdatesData,
  ImportChangelogData,
  MarkRecommendationFeedbackData,
  RecordHookObservationData,
  ResetDemoStateData,
  StatusData
} from "../types/command-data";
import type { CommandContext } from "../types/commands";
import type { LocalProfile, RecommendationFeedback, RecommendationFeedbackRating } from "../types/entities";

export function placeholderProfile(ctx: CommandContext): LocalProfile {
  return {
    id: "local-default",
    display_name: null,
    last_seen_updates_at: null,
    created_at: ctx.generated_at
  };
}

export function placeholderStatusData(ctx: CommandContext): StatusData {
  const profile = placeholderProfile(ctx);

  return {
    profile,
    data_dir: ctx.data_dir,
    repo: ctx.repo,
    hooks: {
      enabled_hint: "unknown",
      config_hint: "Hook capture is implemented by WS6; no hook state is read by the WS0 placeholder.",
      last_observed_at: null
    },
    last_seen_updates_at: profile.last_seen_updates_at,
    counts: {
      codex_updates: 0,
      capability_events: 0,
      hook_observations: 0,
      work_items: 0,
      recommendations: 0,
      recommendation_feedback: 0
    }
  };
}

export function placeholderUpdatesData(ctx: CommandContext): GetUpdatesData {
  return {
    last_seen_updates_at: null,
    mode: "placeholder",
    updates: [],
    recent_highlights: [],
    next_mark_seen_at: ctx.generated_at
  };
}

export function placeholderCapabilityMapData(): CapabilityMapData {
  return {
    summary: {
      total: CAPABILITY_TAXONOMY.length,
      used_recently: 0,
      tried_before_not_recent: 0,
      not_observed: CAPABILITY_TAXONOMY.length,
      unknown_or_not_connected: 0
    },
    groups: CAPABILITY_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      capabilities: group.capability_ids.map((capabilityId) => {
        const capability = mustGetCapability(capabilityId);
        return {
          id: capability.id,
          label: capability.label,
          description: capability.description,
          status: "not_observed",
          event_count: 0,
          last_observed_at: null,
          sources: [],
          confidence: null
        };
      })
    }))
  };
}

export function placeholderRecentWorkData(ctx: CommandContext): GetRecentWorkData {
  return {
    repo: ctx.repo,
    sparse_history: true,
    work_items: []
  };
}

export function placeholderRecommendationsData(): GetRecommendationsData {
  return {
    recommendations: []
  };
}

export function placeholderCoachData(ctx: CommandContext): CoachData {
  return {
    updates: placeholderUpdatesData(ctx),
    capability_map: placeholderCapabilityMapData(),
    recent_work: placeholderRecentWorkData(ctx),
    recommendations: placeholderRecommendationsData(),
    profile: placeholderProfile(ctx)
  };
}

export function placeholderFeedbackData(input: {
  generated_at: string;
  recommendationId?: string;
  rating?: string;
  note?: string;
}): MarkRecommendationFeedbackData {
  const rating = normalizeRating(input.rating);
  const feedback: RecommendationFeedback = {
    id: "placeholder-feedback",
    recommendation_id: input.recommendationId ?? "placeholder-recommendation",
    rating,
    note: input.note ?? null,
    created_at: input.generated_at
  };

  return { feedback };
}

export function placeholderImportChangelogData(ctx: CommandContext): ImportChangelogData {
  return {
    imported_count: 0,
    skipped_count: 0,
    refreshed: false,
    cache_path: path.join(ctx.data_dir, "codex-updates.json"),
    updates: []
  };
}

export function placeholderRecordHookObservationData(): RecordHookObservationData {
  return {
    observation_id: null,
    derived_capability_event_ids: []
  };
}

export function placeholderResetDemoStateData(ctx: CommandContext): ResetDemoStateData {
  const profile = placeholderProfile(ctx);

  return {
    profile,
    seeded_records: [],
    last_seen_updates_at: profile.last_seen_updates_at
  };
}

export function placeholderDeleteLocalHistoryData(ctx: CommandContext): DeleteLocalHistoryData {
  return {
    deleted: [],
    data_dir: ctx.data_dir
  };
}

function mustGetCapability(id: CapabilityId) {
  const capability = getCapability(id);
  if (!capability) {
    throw new Error(`Missing capability taxonomy entry for ${id}`);
  }
  return capability;
}

function normalizeRating(value: string | undefined): RecommendationFeedbackRating {
  return value === "not-useful" ? "not-useful" : "useful";
}
