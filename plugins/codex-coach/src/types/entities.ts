import type { CapabilityId } from "../capabilities/taxonomy";
import type { SourceLabel } from "./sources";

export interface LocalProfile {
  id: string;
  display_name: string | null;
  last_seen_updates_at: string | null;
  created_at: string;
}

export interface CodexUpdate {
  id: string;
  published_at: string;
  title: string;
  summary: string;
  source_url: string;
  capability_tags: CapabilityId[];
  update_topic_tags: string[];
  imported_at: string;
  when_to_use: string;
}

export interface CapabilityEvent {
  id: string;
  user_id: string;
  capability: CapabilityId;
  source: SourceLabel;
  occurred_at: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface HookObservation {
  id: string;
  session_id: string | null;
  turn_id: string | null;
  hook_event_name: string;
  tool_name: string | null;
  source: SourceLabel;
  observed_at: string;
  capability_tags: CapabilityId[];
  metadata: Record<string, unknown>;
}

export interface WorkItem {
  id: string;
  user_id: string;
  source: SourceLabel;
  title: string;
  summary: string;
  completed_at: string;
  signals: Record<string, unknown>;
  artifact_url: string | null;
  repo_path: string | null;
}

export type RecommendationStatus = "new" | "dismissed" | "accepted";

export interface Recommendation {
  id: string;
  user_id: string;
  work_item_id: string;
  capability: CapabilityId;
  message: string;
  reason: string;
  status: RecommendationStatus;
  created_at: string;
  work_item_source: SourceLabel;
}

export type RecommendationFeedbackRating = "useful" | "not-useful";

export interface RecommendationFeedback {
  id: string;
  recommendation_id: string;
  rating: RecommendationFeedbackRating;
  note: string | null;
  created_at: string;
}
