import type { CapabilityId } from "../capabilities/taxonomy";
import type { WorkItem } from "../types/entities";
import { describeSizeSignals, normalizeWorkItemSignals } from "./signals";

export interface RecommendationCandidate {
  capability: CapabilityId;
  message: string;
  reason: string;
  score: number;
  rule_id: string;
  suppressWhenRecent: boolean;
}

const CAPABILITY_PRIORITY: CapabilityId[] = [
  "parallel-agents",
  "cloud-task",
  "computer-use",
  "multimodal-input",
  "github-code-review",
  "worktree-flow",
  "git-workflow",
  "automations",
  "skills",
  "plugins",
  "mcp",
  "hooks",
  "cli-local-chat",
  "codex-app-session",
  "ide-extension",
  "voice-or-mobile"
];

export function selectRecommendationCandidates(
  workItem: WorkItem,
  recentlyUsedCapabilities: ReadonlySet<CapabilityId>
): RecommendationCandidate[] {
  const sorted = sortCandidates(dedupeCandidates(buildCandidates(workItem)));
  const unsuppressed = sorted.filter(
    (candidate) => !candidate.suppressWhenRecent || !recentlyUsedCapabilities.has(candidate.capability)
  );

  return (unsuppressed.length > 0 ? unsuppressed : sorted).slice(0, 2);
}

export function buildCandidates(workItem: WorkItem): RecommendationCandidate[] {
  const signals = normalizeWorkItemSignals(workItem);
  const candidates: RecommendationCandidate[] = [];
  const sizeReason = describeSizeSignals(signals);

  if (signals.largeChange || signals.multipleAreas) {
    candidates.push({
      capability: "parallel-agents",
      score: signals.largeChange && signals.multipleAreas ? 100 : 88,
      message: `Split "${workItem.title}" across parallel agents by area.`,
      reason: `${sizeReason} indicates this work can be decomposed into independent implementation or review tracks.`,
      rule_id: "large-change-parallel-agents",
      suppressWhenRecent: true
    });

    if ((signals.filesChanged !== null && signals.filesChanged >= 20) || (signals.diffLines !== null && signals.diffLines >= 1200)) {
      candidates.push({
        capability: "cloud-task",
        score: 84,
        message: `Delegate the long-running parts of "${workItem.title}" as a cloud task.`,
        reason: `${sizeReason} suggests a bounded background task could handle part of the work while you continue locally.`,
        rule_id: "large-change-cloud-task",
        suppressWhenRecent: true
      });
    }
  }

  if (signals.branchOrWorktree) {
    candidates.push({
      capability: "worktree-flow",
      score: 87,
      message: `Use a worktree-backed flow for "${workItem.title}".`,
      reason: "The work item includes branch or worktree juggling signals, which are easier to isolate with separate worktrees.",
      rule_id: "branch-worktree-flow",
      suppressWhenRecent: true
    });
  }

  if (signals.prOrReview) {
    candidates.push({
      capability: "github-code-review",
      score: 91,
      message: `Use GitHub code review support for "${workItem.title}".`,
      reason: "The work item includes PR or review signals, so review-thread inspection and targeted fixes are likely useful.",
      rule_id: "pr-review-github-code-review",
      suppressWhenRecent: true
    });
  }

  if (signals.repeatedMaintenance) {
    candidates.push({
      capability: "automations",
      score: 82,
      message: `Automate the repeated parts of "${workItem.title}".`,
      reason: "Setup, release, or maintenance signals point to work that can be captured as a recurring Codex workflow.",
      rule_id: "repeated-maintenance-automations",
      suppressWhenRecent: true
    });

    candidates.push({
      capability: "skills",
      score: 76,
      message: `Capture the reusable steps from "${workItem.title}" as a skill.`,
      reason: "Repeated workflow signals suggest the instructions can be made reusable instead of rediscovered next time.",
      rule_id: "repeated-maintenance-skills",
      suppressWhenRecent: true
    });
  }

  if (signals.uiBrowserDebug) {
    candidates.push({
      capability: "computer-use",
      score: 95,
      message: `Use computer-use to inspect "${workItem.title}" in the browser.`,
      reason: "UI, browser, responsive, layout, desktop, or mobile signals are best checked against the rendered application.",
      rule_id: "ui-browser-computer-use",
      suppressWhenRecent: true
    });
  }

  if (signals.visualDesign) {
    candidates.push({
      capability: "multimodal-input",
      score: 92,
      message: `Attach screenshots or visual references for "${workItem.title}".`,
      reason: "Screenshot, image, visual, or design signals can be evaluated more accurately with multimodal context.",
      rule_id: "visual-design-multimodal-input",
      suppressWhenRecent: true
    });
  }

  if (signals.gitHeavy) {
    candidates.push({
      capability: "git-workflow",
      score: 83,
      message: `Use git workflow support for "${workItem.title}".`,
      reason: "Commit, branch, diff, rebase, or merge signals point to a workflow where Codex can inspect history and patch context.",
      rule_id: "git-heavy-git-workflow",
      suppressWhenRecent: true
    });
  }

  if (signals.pluginMcpReusable) {
    if (signals.explicitMcp) {
      candidates.push({
        capability: "mcp",
        score: 90,
        message: `Consider an MCP tool connection for "${workItem.title}".`,
        reason: "MCP signals point to a reusable tool integration rather than one-off manual context passing.",
        rule_id: "plugin-mcp-reusable-mcp",
        suppressWhenRecent: true
      });
    }

    if (signals.explicitPlugin) {
      candidates.push({
        capability: "plugins",
        score: 88,
        message: `Package the reusable workflow from "${workItem.title}" as a plugin.`,
        reason: "Plugin signals indicate the workflow may belong in an installable Codex surface.",
        rule_id: "plugin-mcp-reusable-plugins",
        suppressWhenRecent: true
      });
    }

    if (signals.explicitSkill || (!signals.explicitMcp && !signals.explicitPlugin)) {
      candidates.push({
        capability: "skills",
        score: 86,
        message: `Turn the reusable workflow from "${workItem.title}" into a skill.`,
        reason: "Reusable workflow signals indicate a repeatable instruction bundle would reduce future setup.",
        rule_id: "plugin-mcp-reusable-skills",
        suppressWhenRecent: true
      });
    }
  }

  return candidates;
}

function dedupeCandidates(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
  const bestByCapability = new Map<CapabilityId, RecommendationCandidate>();

  for (const candidate of candidates) {
    const existing = bestByCapability.get(candidate.capability);
    if (!existing || compareCandidates(candidate, existing) < 0) {
      bestByCapability.set(candidate.capability, candidate);
    }
  }

  return Array.from(bestByCapability.values());
}

function sortCandidates(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
  return [...candidates].sort(compareCandidates);
}

function compareCandidates(left: RecommendationCandidate, right: RecommendationCandidate): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  return capabilityPriority(left.capability) - capabilityPriority(right.capability);
}

function capabilityPriority(capability: CapabilityId): number {
  const index = CAPABILITY_PRIORITY.indexOf(capability);
  return index >= 0 ? index : CAPABILITY_PRIORITY.length;
}
