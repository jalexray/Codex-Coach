import type {
  CodexUpdate,
  LocalProfile,
  Recommendation,
  RecommendationFeedback,
  WorkItem
} from "./entities";
import type { SourceRef } from "./sources";
import type { CapabilityGroupId, CapabilityId, CapabilityStatus } from "../capabilities/taxonomy";

export interface StatusData {
  profile: LocalProfile;
  data_dir: string;
  repo: string;
  hooks: {
    enabled_hint: "unknown" | "enabled" | "disabled";
    config_hint: string;
    last_observed_at: string | null;
  };
  last_seen_updates_at: string | null;
  counts: {
    codex_updates: number;
    capability_events: number;
    hook_observations: number;
    work_items: number;
    recommendations: number;
    recommendation_feedback: number;
  };
}

export interface GetUpdatesData {
  last_seen_updates_at: string | null;
  mode: "placeholder" | "new-user" | "delta";
  updates: CodexUpdate[];
  recent_highlights: CodexUpdate[];
  next_mark_seen_at: string;
}

export interface CapabilityMapData {
  summary: {
    total: number;
    used_recently: number;
    tried_before_not_recent: number;
    not_observed: number;
    unknown_or_not_connected: number;
  };
  groups: CapabilityMapGroup[];
}

export interface CapabilityMapGroup {
  id: CapabilityGroupId;
  label: string;
  capabilities: CapabilityMapCapability[];
}

export interface CapabilityMapCapability {
  id: CapabilityId;
  label: string;
  description: string;
  status: CapabilityStatus;
  event_count: number;
  last_observed_at: string | null;
  sources: SourceRef[];
  confidence: number | null;
}

export interface GetRecentWorkData {
  repo: string;
  sparse_history: boolean;
  work_items: WorkItem[];
}

export interface GetRecommendationsData {
  recommendations: Recommendation[];
}

export interface CoachData {
  updates: GetUpdatesData;
  capability_map: CapabilityMapData;
  recent_work: GetRecentWorkData;
  recommendations: GetRecommendationsData;
  profile: LocalProfile;
}

export interface MarkRecommendationFeedbackData {
  feedback: RecommendationFeedback;
}

export interface ImportChangelogData {
  imported_count: number;
  skipped_count: number;
  refreshed: boolean;
  cache_path: string;
  updates: CodexUpdate[];
}

export interface RecordHookObservationData {
  observation_id: string | null;
  derived_capability_event_ids: string[];
}

export interface ResetDemoStateData {
  profile: LocalProfile;
  seeded_records: Array<{
    entity: string;
    count: number;
  }>;
  last_seen_updates_at: string | null;
}

export interface DeleteLocalHistoryData {
  deleted: Array<{
    entity: string;
    count: number;
  }>;
  data_dir: string;
}
