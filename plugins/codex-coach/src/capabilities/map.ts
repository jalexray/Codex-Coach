import {
  CAPABILITY_GROUPS,
  CAPABILITY_TAXONOMY,
  getCapability,
  type CapabilityId,
  type CapabilityStatus
} from "./taxonomy";
import { loadCapabilityEvents } from "./events";
import { SOURCE_LABELS, type SourceLabel, type SourceRef } from "../types/sources";
import type { CapabilityMapData, CapabilityMapCapability } from "../types/command-data";
import type { CommandContext, CommandResult } from "../types/commands";
import type { CapabilityEvent } from "../types/entities";

const RECENT_USAGE_WINDOW_DAYS = 30;
const RECENT_USAGE_WINDOW_MS = RECENT_USAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const UNKNOWN_WHEN_UNOBSERVED = new Set<CapabilityId>([
  "codex-app-session",
  "cloud-task",
  "automations",
  "github-code-review",
  "ide-extension",
  "voice-or-mobile"
]);

const SOURCE_DESCRIPTIONS: Record<SourceLabel, string> = {
  [SOURCE_LABELS.GIT]: "Local git metadata-derived capability events.",
  [SOURCE_LABELS.HOOK]: "Best-effort local hook observations; not complete telemetry.",
  [SOURCE_LABELS.USER_SUMMARY]: "User-provided local summary.",
  [SOURCE_LABELS.CODEX_CHANGELOG]: "Codex changelog capability metadata.",
  [SOURCE_LABELS.CODEX_SESSION]: "Local Codex session metadata.",
  [SOURCE_LABELS.CODEX_PLUGIN_METADATA]: "Local Codex plugin metadata.",
  [SOURCE_LABELS.LOCAL_IMPORT]: "Local imported capability event data.",
  [SOURCE_LABELS.DEMO_FALLBACK]: "Demo fallback capability event data."
};

export async function getCapabilityMap(ctx: CommandContext): Promise<CapabilityMapData> {
  const result = await getCapabilityMapResult(ctx);
  return result.data;
}

export async function getCapabilityMapResult(ctx: CommandContext): Promise<CommandResult<CapabilityMapData>> {
  const loadResult = await loadCapabilityEvents(ctx);
  const demoEvents = shouldUseDemoFallback(ctx, loadResult.events) ? demoCapabilityEvents(ctx) : [];
  const events = [...loadResult.events, ...demoEvents];
  const data = buildCapabilityMap(ctx.generated_at, events);
  const warnings = [...loadResult.warnings];

  if (demoEvents.length > 0) {
    warnings.push("demo_fallback_capability_events_used");
  }

  if (events.some((event) => event.source === SOURCE_LABELS.HOOK)) {
    warnings.push("hook_capability_events_best_effort_not_complete_telemetry");
  }

  return {
    data,
    warnings,
    sources: summarizeSources(events)
  };
}

export function buildCapabilityMap(generatedAt: string, events: ReadonlyArray<CapabilityEvent>): CapabilityMapData {
  assertTaxonomyCoverage();

  const nowMs = Date.parse(generatedAt);
  const generatedAtMs = Number.isNaN(nowMs) ? Date.now() : nowMs;
  const eventsByCapability = groupEventsByCapability(events);
  const summary: CapabilityMapData["summary"] = {
    total: CAPABILITY_TAXONOMY.length,
    used_recently: 0,
    tried_before_not_recent: 0,
    not_observed: 0,
    unknown_or_not_connected: 0
  };

  const groups = CAPABILITY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    capabilities: group.capability_ids.map((capabilityId) => {
      const capability = getCapability(capabilityId);
      if (!capability) {
        throw new Error(`Missing capability taxonomy entry for ${capabilityId}`);
      }

      const capabilityEvents = eventsByCapability.get(capabilityId) ?? [];
      const status = statusForCapability(capabilityId, capabilityEvents, generatedAtMs);
      summary[status] += 1;

      return capabilityMapEntry(capability, capabilityEvents, status);
    })
  }));

  return {
    summary,
    groups
  };
}

function capabilityMapEntry(
  capability: (typeof CAPABILITY_TAXONOMY)[number],
  events: ReadonlyArray<CapabilityEvent>,
  status: CapabilityStatus
): CapabilityMapCapability {
  return {
    id: capability.id,
    label: capability.label,
    description: capability.description,
    status,
    event_count: events.length,
    last_observed_at: latestObservedAt(events),
    sources: summarizeSources(events),
    confidence: averageConfidence(events)
  };
}

function statusForCapability(
  capabilityId: CapabilityId,
  events: ReadonlyArray<CapabilityEvent>,
  generatedAtMs: number
): CapabilityStatus {
  if (events.length === 0) {
    return UNKNOWN_WHEN_UNOBSERVED.has(capabilityId) ? "unknown_or_not_connected" : "not_observed";
  }

  const lastObservedAtMs = Math.max(...events.map((event) => Date.parse(event.occurred_at)));
  if (generatedAtMs - lastObservedAtMs <= RECENT_USAGE_WINDOW_MS) {
    return "used_recently";
  }

  return "tried_before_not_recent";
}

function groupEventsByCapability(events: ReadonlyArray<CapabilityEvent>): Map<CapabilityId, CapabilityEvent[]> {
  const grouped = new Map<CapabilityId, CapabilityEvent[]>();
  for (const event of events) {
    const existing = grouped.get(event.capability) ?? [];
    existing.push(event);
    grouped.set(event.capability, existing);
  }
  return grouped;
}

function latestObservedAt(events: ReadonlyArray<CapabilityEvent>): string | null {
  if (events.length === 0) {
    return null;
  }

  return events
    .map((event) => event.occurred_at)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

function averageConfidence(events: ReadonlyArray<CapabilityEvent>): number | null {
  if (events.length === 0) {
    return null;
  }

  const average = events.reduce((total, event) => total + event.confidence, 0) / events.length;
  return Math.round(average * 100) / 100;
}

function summarizeSources(events: ReadonlyArray<CapabilityEvent>): SourceRef[] {
  const counts = new Map<SourceLabel, number>();
  for (const event of events) {
    counts.set(event.source, (counts.get(event.source) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, recordCount]) => ({
      label,
      description: SOURCE_DESCRIPTIONS[label],
      record_count: recordCount
    }));
}

function shouldUseDemoFallback(ctx: CommandContext, events: ReadonlyArray<CapabilityEvent>): boolean {
  return ctx.demo && events.length === 0;
}

function demoCapabilityEvents(ctx: CommandContext): CapabilityEvent[] {
  return [
    demoCapabilityEvent(ctx, "cli-local-chat", 1, 0.95),
    demoCapabilityEvent(ctx, "git-workflow", 2, 0.8),
    demoCapabilityEvent(ctx, "computer-use", 5, 0.72),
    demoCapabilityEvent(ctx, "skills", 75, 0.64)
  ];
}

function demoCapabilityEvent(
  ctx: CommandContext,
  capability: CapabilityId,
  daysAgo: number,
  confidence: number
): CapabilityEvent {
  return {
    id: `demo-capability-${capability}`,
    user_id: "local-demo",
    capability,
    source: SOURCE_LABELS.DEMO_FALLBACK,
    occurred_at: isoDaysBefore(ctx.generated_at, daysAgo),
    confidence,
    metadata: {
      fallback: true,
      reason: "Demo fallback event used when no local capability events are available."
    }
  };
}

function isoDaysBefore(anchorIso: string, daysAgo: number): string {
  const anchorMs = Date.parse(anchorIso);
  const anchor = Number.isNaN(anchorMs) ? new Date() : new Date(anchorMs);
  anchor.setUTCDate(anchor.getUTCDate() - daysAgo);
  return anchor.toISOString();
}

function assertTaxonomyCoverage(): void {
  const seen = new Set<CapabilityId>();
  for (const group of CAPABILITY_GROUPS) {
    for (const capabilityId of group.capability_ids) {
      if (seen.has(capabilityId)) {
        throw new Error(`Duplicate capability group entry for ${capabilityId}`);
      }
      seen.add(capabilityId);
    }
  }

  if (seen.size !== CAPABILITY_TAXONOMY.length) {
    throw new Error("Capability groups do not cover every taxonomy capability exactly once.");
  }
}
