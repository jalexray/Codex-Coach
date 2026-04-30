import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CoachError } from "../lib/errors";
import { isCapabilityId, type CapabilityId } from "../capabilities/taxonomy";
import type {
  Recommendation,
  RecommendationFeedback,
  RecommendationFeedbackRating,
  WorkItem
} from "../types/entities";

export const RECOMMENDER_STORE_FILE = "recommender-state.json";

export interface StoredCapabilityEvent {
  id: string;
  capability: CapabilityId;
  occurred_at: string;
}

export interface RecommenderState {
  version: 1;
  user_id: string;
  work_items: WorkItem[];
  recommendations: Recommendation[];
  recommendation_feedback: RecommendationFeedback[];
  capability_events: StoredCapabilityEvent[];
}

const DEFAULT_USER_ID = "local-default";

export function recommenderStorePath(dataDir: string): string {
  return path.join(dataDir, RECOMMENDER_STORE_FILE);
}

export async function loadRecommenderState(dataDir: string): Promise<RecommenderState> {
  const filePath = recommenderStorePath(dataDir);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return emptyState();
    }
    if (error instanceof SyntaxError) {
      throw new CoachError("storage_error", `Unable to parse recommender state at ${filePath}.`);
    }
    throw error;
  }
}

export async function saveRecommenderState(dataDir: string, state: RecommenderState): Promise<void> {
  const filePath = recommenderStorePath(dataDir);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(sortState(state), null, 2)}\n`, "utf8");
}

export function recommendationId(workItemId: string, capability: CapabilityId): string {
  return `rec-${stableHash(workItemId, capability)}`;
}

export function feedbackId(recommendationIdValue: string): string {
  return `feedback-${stableHash(recommendationIdValue)}`;
}

export function normalizeRating(value: string): RecommendationFeedbackRating | null {
  if (value === "useful" || value === "not-useful") {
    return value;
  }

  return null;
}

function emptyState(): RecommenderState {
  return {
    version: 1,
    user_id: DEFAULT_USER_ID,
    work_items: [],
    recommendations: [],
    recommendation_feedback: [],
    capability_events: []
  };
}

function normalizeState(value: unknown): RecommenderState {
  if (!value || typeof value !== "object") {
    return emptyState();
  }

  const input = value as Partial<RecommenderState>;

  return {
    version: 1,
    user_id: typeof input.user_id === "string" && input.user_id.length > 0 ? input.user_id : DEFAULT_USER_ID,
    work_items: Array.isArray(input.work_items) ? input.work_items.filter(isWorkItem) : [],
    recommendations: Array.isArray(input.recommendations) ? input.recommendations.filter(isRecommendation) : [],
    recommendation_feedback: Array.isArray(input.recommendation_feedback)
      ? input.recommendation_feedback.filter(isRecommendationFeedback)
      : [],
    capability_events: Array.isArray(input.capability_events) ? input.capability_events.filter(isStoredCapabilityEvent) : []
  };
}

function sortState(state: RecommenderState): RecommenderState {
  return {
    ...state,
    work_items: [...state.work_items].sort(compareWorkItems),
    recommendations: [...state.recommendations].sort(compareRecommendations),
    recommendation_feedback: [...state.recommendation_feedback].sort(compareFeedback),
    capability_events: [...state.capability_events].sort((left, right) =>
      right.occurred_at.localeCompare(left.occurred_at) || left.id.localeCompare(right.id)
    )
  };
}

function isWorkItem(value: unknown): value is WorkItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as WorkItem;
  return (
    typeof input.id === "string" &&
    typeof input.user_id === "string" &&
    typeof input.source === "string" &&
    typeof input.title === "string" &&
    typeof input.summary === "string" &&
    typeof input.completed_at === "string" &&
    Boolean(input.signals) &&
    typeof input.signals === "object"
  );
}

function isRecommendation(value: unknown): value is Recommendation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Recommendation;
  return (
    typeof input.id === "string" &&
    typeof input.user_id === "string" &&
    typeof input.work_item_id === "string" &&
    typeof input.capability === "string" &&
    isCapabilityId(input.capability) &&
    typeof input.message === "string" &&
    typeof input.reason === "string" &&
    (input.status === "new" || input.status === "accepted" || input.status === "dismissed") &&
    typeof input.created_at === "string" &&
    typeof input.work_item_source === "string"
  );
}

function isRecommendationFeedback(value: unknown): value is RecommendationFeedback {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as RecommendationFeedback;
  return (
    typeof input.id === "string" &&
    typeof input.recommendation_id === "string" &&
    (input.rating === "useful" || input.rating === "not-useful") &&
    (input.note === null || typeof input.note === "string") &&
    typeof input.created_at === "string"
  );
}

function isStoredCapabilityEvent(value: unknown): value is StoredCapabilityEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as StoredCapabilityEvent;
  return typeof input.id === "string" && isCapabilityId(String(input.capability)) && typeof input.occurred_at === "string";
}

function compareWorkItems(left: WorkItem, right: WorkItem): number {
  return right.completed_at.localeCompare(left.completed_at) || left.id.localeCompare(right.id);
}

function compareRecommendations(left: Recommendation, right: Recommendation): number {
  return (
    right.created_at.localeCompare(left.created_at) ||
    left.work_item_id.localeCompare(right.work_item_id) ||
    left.capability.localeCompare(right.capability)
  );
}

function compareFeedback(left: RecommendationFeedback, right: RecommendationFeedback): number {
  return right.created_at.localeCompare(left.created_at) || left.id.localeCompare(right.id);
}

function stableHash(...parts: string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 12);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
