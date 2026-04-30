import type { WorkItem } from "../types/entities";

export interface WorkItemSignals {
  text: string;
  filesChanged: number | null;
  areaCount: number | null;
  diffLines: number | null;
  largeChange: boolean;
  multipleAreas: boolean;
  branchOrWorktree: boolean;
  prOrReview: boolean;
  repeatedMaintenance: boolean;
  uiBrowserDebug: boolean;
  visualDesign: boolean;
  gitHeavy: boolean;
  pluginMcpReusable: boolean;
  explicitMcp: boolean;
  explicitPlugin: boolean;
  explicitSkill: boolean;
}

const FILE_COUNT_KEYS = ["files_changed", "changed_files_count", "file_count", "changed_file_count"];
const DIFF_LINE_KEYS = ["diff_lines", "lines_changed", "changed_lines", "loc_changed"];
const ADDITION_KEYS = ["additions", "lines_added"];
const DELETION_KEYS = ["deletions", "lines_deleted", "removals"];
const AREA_KEYS = ["areas", "changed_areas", "modules", "packages", "components"];

const BOOLEAN_KEYS = {
  largeChange: ["large_diff", "large_change", "large_refactor"],
  branchOrWorktree: ["branch_juggling", "worktree_flow", "worktree_juggling"],
  prOrReview: ["pr", "pull_request", "review", "code_review"],
  repeatedMaintenance: ["repeated", "recurring", "maintenance", "release", "setup"],
  uiBrowserDebug: ["ui_debug", "browser_debug", "responsive_debug", "layout_debug"],
  visualDesign: ["screenshot", "image", "visual", "design_review"],
  gitHeavy: ["git_heavy", "merge", "rebase", "branch", "commit"],
  pluginMcpReusable: ["plugin", "mcp", "skill", "reusable_workflow"]
} as const;

const STRUCTURED_SIGNAL_KEYS = new Set<string>([
  ...FILE_COUNT_KEYS,
  ...DIFF_LINE_KEYS,
  ...ADDITION_KEYS,
  ...DELETION_KEYS,
  ...AREA_KEYS,
  ...BOOLEAN_KEYS.largeChange,
  ...BOOLEAN_KEYS.branchOrWorktree,
  ...BOOLEAN_KEYS.prOrReview,
  ...BOOLEAN_KEYS.repeatedMaintenance,
  ...BOOLEAN_KEYS.uiBrowserDebug,
  ...BOOLEAN_KEYS.visualDesign,
  ...BOOLEAN_KEYS.gitHeavy,
  ...BOOLEAN_KEYS.pluginMcpReusable,
  "area_count",
  "changed_area_count",
  "changed_files",
  "terms",
  "keywords",
  "tags"
]);

const TERM_GROUPS = {
  branchOrWorktree: ["worktree", "work tree", "branch juggling", "branch switch", "stash", "branch isolation"],
  prOrReview: ["pr", "pull request", "review", "code review", "github review", "requested changes"],
  repeatedMaintenance: [
    "again",
    "recurring",
    "repeated",
    "routine",
    "maintenance",
    "release",
    "setup",
    "onboarding",
    "template",
    "boilerplate"
  ],
  uiBrowserDebug: [
    "ui",
    "browser",
    "page",
    "layout",
    "responsive",
    "desktop",
    "mobile",
    "viewport",
    "frontend",
    "component",
    "css",
    "debugged"
  ],
  visualDesign: ["screenshot", "image", "visual", "design", "mockup", "figma", "diagram", "wireframe"],
  gitHeavy: [
    "commit",
    "branch",
    "diff",
    "rebase",
    "merge",
    "conflict",
    "cherry-pick",
    "cherry pick",
    "git"
  ],
  pluginMcpReusable: ["plugin", "mcp", "skill", "skills", "reusable", "workflow", "connector", "tool integration"],
  explicitMcp: ["mcp"],
  explicitPlugin: ["plugin", "plugins"],
  explicitSkill: ["skill", "skills"]
} as const;

export function normalizeWorkItemSignals(workItem: WorkItem): WorkItemSignals {
  const text = buildSearchText(workItem);
  const filesChanged = readNumber(workItem.signals, FILE_COUNT_KEYS) ?? countArray(workItem.signals.changed_files);
  const areaCount = readNumber(workItem.signals, ["area_count", "changed_area_count"]) ?? countArrayKeys(workItem.signals, AREA_KEYS);
  const diffLines =
    readNumber(workItem.signals, DIFF_LINE_KEYS) ?? sumNumbers(workItem.signals, ADDITION_KEYS, DELETION_KEYS);

  const largeChange =
    readBoolean(workItem.signals, BOOLEAN_KEYS.largeChange) ||
    (filesChanged !== null && filesChanged >= 12) ||
    (diffLines !== null && diffLines >= 500);
  const multipleAreas =
    (areaCount !== null && areaCount >= 2) || textHasAny(text, ["multiple areas", "several areas"]);

  return {
    text,
    filesChanged,
    areaCount,
    diffLines,
    largeChange,
    multipleAreas,
    branchOrWorktree:
      readBoolean(workItem.signals, BOOLEAN_KEYS.branchOrWorktree) || textHasAny(text, TERM_GROUPS.branchOrWorktree),
    prOrReview: readBoolean(workItem.signals, BOOLEAN_KEYS.prOrReview) || textHasAny(text, TERM_GROUPS.prOrReview),
    repeatedMaintenance:
      readBoolean(workItem.signals, BOOLEAN_KEYS.repeatedMaintenance) ||
      textHasAny(text, TERM_GROUPS.repeatedMaintenance),
    uiBrowserDebug:
      readBoolean(workItem.signals, BOOLEAN_KEYS.uiBrowserDebug) || textHasAny(text, TERM_GROUPS.uiBrowserDebug),
    visualDesign: readBoolean(workItem.signals, BOOLEAN_KEYS.visualDesign) || textHasAny(text, TERM_GROUPS.visualDesign),
    gitHeavy: readBoolean(workItem.signals, BOOLEAN_KEYS.gitHeavy) || textHasAny(text, TERM_GROUPS.gitHeavy),
    pluginMcpReusable:
      readBoolean(workItem.signals, BOOLEAN_KEYS.pluginMcpReusable) || textHasAny(text, TERM_GROUPS.pluginMcpReusable),
    explicitMcp: textHasAny(text, TERM_GROUPS.explicitMcp),
    explicitPlugin: textHasAny(text, TERM_GROUPS.explicitPlugin),
    explicitSkill: textHasAny(text, TERM_GROUPS.explicitSkill)
  };
}

export function describeSizeSignals(signals: WorkItemSignals): string {
  const parts: string[] = [];
  if (signals.filesChanged !== null) {
    parts.push(`${signals.filesChanged} files changed`);
  }
  if (signals.areaCount !== null) {
    parts.push(`${signals.areaCount} areas touched`);
  }
  if (signals.diffLines !== null) {
    parts.push(`${signals.diffLines} changed lines`);
  }

  return parts.length > 0 ? parts.join(", ") : "large or cross-area change signals";
}

function buildSearchText(workItem: WorkItem): string {
  const parts = [workItem.title, workItem.summary];

  for (const [key, value] of Object.entries(workItem.signals)) {
    if (!STRUCTURED_SIGNAL_KEYS.has(key)) {
      parts.push(key.replace(/[_-]/g, " "));
    }
    collectSignalText(value, parts);
  }

  return parts.join(" ").toLowerCase();
}

function collectSignalText(value: unknown, parts: string[]): void {
  if (typeof value === "string" || typeof value === "number") {
    parts.push(String(value));
    return;
  }

  if (typeof value === "boolean") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectSignalText(item, parts);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      parts.push(key.replace(/[_-]/g, " "));
      collectSignalText(nestedValue, parts);
    }
  }
}

function readNumber(signals: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = signals[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function sumNumbers(
  signals: Record<string, unknown>,
  leftKeys: readonly string[],
  rightKeys: readonly string[]
): number | null {
  const left = readNumber(signals, leftKeys);
  const right = readNumber(signals, rightKeys);
  if (left === null && right === null) {
    return null;
  }

  return (left ?? 0) + (right ?? 0);
}

function readBoolean(signals: Record<string, unknown>, keys: readonly string[]): boolean {
  for (const key of keys) {
    const value = signals[key];
    if (value === true) {
      return true;
    }
    if (typeof value === "string" && ["true", "yes", "1"].includes(value.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function countArray(value: unknown): number | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.length;
}

function countArrayKeys(signals: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const count = countArray(signals[key]);
    if (count !== null) {
      return count;
    }
  }

  return null;
}

function textHasAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => {
    if (term.length <= 3) {
      return new RegExp(`\\b${escapeRegExp(term)}\\b`).test(text);
    }
    return text.includes(term);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
