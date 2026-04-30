import path from "node:path";
import { CoachError } from "../lib/errors";
import type { CapabilityId } from "../capabilities/taxonomy";
import type { GetRecommendationsData, MarkRecommendationFeedbackData } from "../types/command-data";
import type { CommandContext } from "../types/commands";
import type { Recommendation, RecommendationFeedback, WorkItem } from "../types/entities";
import { SOURCE_LABELS, type SourceRef } from "../types/sources";
import { demoWorkItems } from "./fixtures";
import { selectRecommendationCandidates } from "./rules";
import {
  feedbackId,
  loadRecommenderState,
  normalizeRating,
  recommendationId,
  recommenderStorePath,
  saveRecommenderState,
  type RecommenderState
} from "./store";

const RECENT_CAPABILITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface FeedbackInput {
  recommendationId?: string;
  rating?: string;
  note?: string;
}

export async function getRecommendations(ctx: CommandContext): Promise<GetRecommendationsData> {
  const state = await loadRecommenderState(ctx.data_dir);
  let changed = ensureWorkItems(state);
  const recentlyUsedCapabilities = collectRecentlyUsedCapabilities(state, ctx.generated_at);
  const generated = generateRecommendations(state, ctx.generated_at, recentlyUsedCapabilities);

  if (upsertRecommendations(state, generated)) {
    changed = true;
  }

  if (changed) {
    await saveRecommenderState(ctx.data_dir, state);
  }

  return {
    recommendations: generated
  };
}

export async function markRecommendationFeedback(
  ctx: CommandContext,
  input: FeedbackInput
): Promise<MarkRecommendationFeedbackData> {
  const recommendationIdValue = input.recommendationId;
  if (!recommendationIdValue) {
    throw new CoachError("invalid_input", "Missing required --recommendation-id option.", {}, 2);
  }

  const rating = normalizeRating(input.rating ?? "");
  if (!rating) {
    throw new CoachError("invalid_input", "Rating must be useful or not-useful.", { rating: input.rating }, 2);
  }

  let state = await loadRecommenderState(ctx.data_dir);
  if (!state.recommendations.some((recommendation) => recommendation.id === recommendationIdValue)) {
    await getRecommendations(ctx);
    state = await loadRecommenderState(ctx.data_dir);
  }

  const recommendation = state.recommendations.find((candidate) => candidate.id === recommendationIdValue);
  if (!recommendation) {
    throw new CoachError("not_found", `Recommendation ${recommendationIdValue} was not found.`, {}, 2);
  }

  recommendation.status = rating === "useful" ? "accepted" : "dismissed";

  const feedback: RecommendationFeedback = {
    id: feedbackId(recommendationIdValue),
    recommendation_id: recommendationIdValue,
    rating,
    note: normalizeNote(input.note),
    created_at: ctx.generated_at
  };

  const existingFeedbackIndex = state.recommendation_feedback.findIndex((entry) => entry.id === feedback.id);
  if (existingFeedbackIndex >= 0) {
    state.recommendation_feedback[existingFeedbackIndex] = feedback;
  } else {
    state.recommendation_feedback.push(feedback);
  }

  await saveRecommenderState(ctx.data_dir, state);
  return { feedback };
}

export function recommendationSources(ctx: CommandContext, data: GetRecommendationsData | null = null): SourceRef[] {
  const sources: SourceRef[] = [
    {
      label: SOURCE_LABELS.LOCAL_IMPORT,
      description: "Local Codex Coach recommender state.",
      path: recommenderStorePath(ctx.data_dir)
    }
  ];

  if (data?.recommendations.some((recommendation) => recommendation.work_item_source === SOURCE_LABELS.DEMO_FALLBACK)) {
    sources.push({
      label: SOURCE_LABELS.DEMO_FALLBACK,
      description: "Deterministic demo work-item fixtures used when no local work-item store is present.",
      path: path.join("plugins", "codex-coach", "src", "recommender", "fixtures.ts"),
      record_count: demoWorkItems().length
    });
  }

  return sources;
}

function ensureWorkItems(state: RecommenderState): boolean {
  if (state.work_items.length > 0) {
    let changed = false;
    const demos = demoWorkItems();
    const demoById = new Map(demos.map((workItem) => [workItem.id, workItem]));

    state.work_items = state.work_items.map((workItem) => {
      const demo = demoById.get(workItem.id);
      if (!demo || workItem.source !== SOURCE_LABELS.DEMO_FALLBACK) {
        return workItem;
      }

      if (JSON.stringify(workItem) !== JSON.stringify(demo)) {
        changed = true;
        return demo;
      }

      return workItem;
    });

    return changed;
  }

  state.work_items = demoWorkItems();
  return true;
}

function generateRecommendations(
  state: RecommenderState,
  generatedAt: string,
  recentlyUsedCapabilities: ReadonlySet<CapabilityId>
): Recommendation[] {
  const existingById = new Map(state.recommendations.map((recommendation) => [recommendation.id, recommendation]));
  const workItems = [...state.work_items].sort(compareWorkItems);
  const recommendations: Recommendation[] = [];

  for (const workItem of workItems) {
    const candidates = selectRecommendationCandidates(workItem, recentlyUsedCapabilities);
    for (const candidate of candidates) {
      const id = recommendationId(workItem.id, candidate.capability);
      const existing = existingById.get(id);
      recommendations.push({
        id,
        user_id: workItem.user_id || state.user_id,
        work_item_id: workItem.id,
        capability: candidate.capability,
        message: candidate.message,
        reason: candidate.reason,
        status: existing?.status ?? "new",
        created_at: existing?.created_at ?? generatedAt,
        work_item_source: workItem.source
      });
    }
  }

  return recommendations.sort(compareRecommendations);
}

function upsertRecommendations(state: RecommenderState, recommendations: Recommendation[]): boolean {
  let changed = false;
  const nextById = new Map(state.recommendations.map((recommendation) => [recommendation.id, recommendation]));

  for (const recommendation of recommendations) {
    const existing = nextById.get(recommendation.id);
    if (!existing || hasRecommendationChanged(existing, recommendation)) {
      nextById.set(recommendation.id, recommendation);
      changed = true;
    }
  }

  state.recommendations = Array.from(nextById.values());
  return changed;
}

function hasRecommendationChanged(left: Recommendation, right: Recommendation): boolean {
  return (
    left.user_id !== right.user_id ||
    left.work_item_id !== right.work_item_id ||
    left.capability !== right.capability ||
    left.message !== right.message ||
    left.reason !== right.reason ||
    left.status !== right.status ||
    left.created_at !== right.created_at ||
    left.work_item_source !== right.work_item_source
  );
}

function collectRecentlyUsedCapabilities(state: RecommenderState, generatedAt: string): Set<CapabilityId> {
  const now = Date.parse(generatedAt);
  const recent = new Set<CapabilityId>();

  for (const event of state.capability_events) {
    if (isRecent(event.occurred_at, now)) {
      recent.add(event.capability);
    }
  }

  const recommendationById = new Map(state.recommendations.map((recommendation) => [recommendation.id, recommendation]));

  for (const recommendation of state.recommendations) {
    if (recommendation.status === "accepted" && isRecent(recommendation.created_at, now)) {
      recent.add(recommendation.capability);
    }
  }

  for (const feedback of state.recommendation_feedback) {
    const recommendation = recommendationById.get(feedback.recommendation_id);
    if (feedback.rating === "useful" && recommendation && isRecent(feedback.created_at, now)) {
      recent.add(recommendation.capability);
    }
  }

  return recent;
}

function isRecent(isoTimestamp: string, now: number): boolean {
  const then = Date.parse(isoTimestamp);
  return Number.isFinite(then) && Number.isFinite(now) && now - then <= RECENT_CAPABILITY_WINDOW_MS;
}

function normalizeNote(note: string | undefined): string | null {
  if (typeof note !== "string") {
    return null;
  }

  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
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
