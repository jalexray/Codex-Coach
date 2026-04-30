import path from "node:path";
import type { CapabilityId } from "../capabilities/taxonomy";

export interface WorkSignalInferenceInput {
  title: string;
  branch_names: string[];
  file_paths: string[];
  files_changed: number;
  insertions: number;
  deletions: number;
}

export interface WorkSignalInference {
  inferred_capabilities: CapabilityId[];
  inference_reasons: string[];
  keywords: string[];
}

export function inferWorkSignals(input: WorkSignalInferenceInput): WorkSignalInference {
  const haystack = [input.title, ...input.branch_names, ...input.file_paths].join(" ").toLowerCase();
  const totalLineChanges = input.insertions + input.deletions;
  const directories = topLevelDirectories(input.file_paths);
  const capabilities: CapabilityId[] = [];
  const reasons: string[] = [];
  const keywords = new Set<string>();

  addCapability(capabilities, reasons, "git-workflow", "Work was imported from local git metadata.");

  if (matches(haystack, ["plugin", ".codex-plugin", "marketplace"])) {
    keywords.add("plugin");
    addCapability(capabilities, reasons, "plugins", "Plugin-related paths or commit metadata were present.");
  }

  if (matches(haystack, ["skill", "skill.md"])) {
    keywords.add("skill");
    addCapability(capabilities, reasons, "skills", "Skill-related paths or commit metadata were present.");
  }

  if (matches(haystack, ["hook", "posttooluse", "sessionstart"])) {
    keywords.add("hook");
    addCapability(capabilities, reasons, "hooks", "Hook-related paths or commit metadata were present.");
  }

  if (matches(haystack, ["mcp", "connector"])) {
    keywords.add("mcp");
    addCapability(capabilities, reasons, "mcp", "MCP or connector-related metadata was present.");
  }

  if (matches(haystack, ["automation", "scheduled", "cron", "workflow"])) {
    keywords.add("automation");
    addCapability(capabilities, reasons, "automations", "Automation-related metadata was present.");
  }

  if (matches(haystack, ["github", "pull request", " pr ", "review"])) {
    keywords.add("review");
    addCapability(capabilities, reasons, "github-code-review", "Review or GitHub-related metadata was present.");
  }

  if (matches(haystack, ["browser", "desktop", "mobile", "responsive", "layout", "ui", "settings page"])) {
    keywords.add("ui-qa");
    addCapability(capabilities, reasons, "computer-use", "UI or responsive layout metadata was present.");
  }

  if (matches(haystack, ["screenshot", "image", "diagram", "mockup"]) || hasImagePath(input.file_paths)) {
    keywords.add("visual-context");
    addCapability(capabilities, reasons, "multimodal-input", "Image or screenshot metadata was present.");
  }

  if (matches(haystack, ["worktree"])) {
    keywords.add("worktree");
    addCapability(capabilities, reasons, "worktree-flow", "Worktree-related metadata was present.");
  }

  if (
    input.files_changed >= 8 ||
    totalLineChanges >= 500 ||
    directories.length >= 4 ||
    matches(haystack, ["large refactor", "split across", "parallel", "auth", "billing"])
  ) {
    keywords.add("large-change");
    addCapability(capabilities, reasons, "parallel-agents", "The change spans enough files or areas to split into parallel tasks.");
  }

  if (input.files_changed >= 12 || totalLineChanges >= 900 || matches(haystack, ["cloud task", "cloud tasks"])) {
    keywords.add("delegation");
    addCapability(capabilities, reasons, "cloud-task", "The work appears large enough for delegated task execution.");
  }

  return {
    inferred_capabilities: capabilities,
    inference_reasons: reasons,
    keywords: [...keywords].sort()
  };
}

export function topLevelDirectories(filePaths: string[]): string[] {
  return [...new Set(filePaths.map(topLevelDirectory).filter((value): value is string => value !== null))].sort();
}

export function fileExtensions(filePaths: string[]): string[] {
  return [
    ...new Set(
      filePaths
        .map((filePath) => path.extname(filePath).toLowerCase())
        .filter((extension) => extension.length > 0)
    )
  ].sort();
}

function topLevelDirectory(filePath: string): string | null {
  const segments = filePath.split("/");
  if (segments.length <= 1) {
    return "repo-root";
  }

  const [firstSegment] = segments;
  return firstSegment && firstSegment.length > 0 ? firstSegment : null;
}

function addCapability(
  capabilities: CapabilityId[],
  reasons: string[],
  capability: CapabilityId,
  reason: string
): void {
  if (!capabilities.includes(capability)) {
    capabilities.push(capability);
    reasons.push(reason);
  }
}

function matches(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function hasImagePath(filePaths: string[]): boolean {
  const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);
  return filePaths.some((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
}
