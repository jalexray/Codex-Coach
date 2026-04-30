import path from "node:path";

export type JsonObject = Record<string, unknown>;

export interface HookParseResult {
  payload: JsonObject | null;
  warnings: string[];
}

export interface TextSummary {
  present: true;
  char_count: number;
  line_count: number;
  code_fence_count: number;
}

const MAX_KEYS = 30;
const MAX_PATHS = 50;
const SAFE_COMMAND_NAMES = new Set([
  "bash",
  "bun",
  "cargo",
  "cd",
  "cmake",
  "codex",
  "echo",
  "eslint",
  "gh",
  "git",
  "go",
  "jest",
  "make",
  "node",
  "npm",
  "pnpm",
  "prettier",
  "printf",
  "pytest",
  "python",
  "python3",
  "ruff",
  "tsc",
  "uv",
  "vitest",
  "yarn"
]);
const SAFE_GIT_SUBCOMMANDS = new Set([
  "add",
  "branch",
  "checkout",
  "commit",
  "diff",
  "fetch",
  "log",
  "merge",
  "pull",
  "push",
  "rebase",
  "restore",
  "show",
  "status",
  "switch",
  "tag",
  "worktree"
]);
const SAFE_GH_SUBCOMMANDS = new Set(["api", "auth", "issue", "pr", "repo", "run", "workflow"]);
const SAFE_MCP_VALUE_KEYS = new Set([
  "branch",
  "commit",
  "filename",
  "file_path",
  "head",
  "issue_number",
  "owner",
  "path",
  "pr_number",
  "pull_number",
  "ref",
  "repo",
  "repository",
  "sha"
]);

export function parseHookJson(stdin: string | null): HookParseResult {
  if (!stdin) {
    return { payload: null, warnings: ["no_hook_payload_received"] };
  }

  try {
    const parsed: unknown = JSON.parse(stdin);
    if (!isJsonObject(parsed)) {
      return { payload: null, warnings: ["hook_payload_not_object"] };
    }

    return { payload: parsed, warnings: [] };
  } catch {
    return { payload: null, warnings: ["invalid_hook_payload_json"] };
  }
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringField(object: JsonObject, key: string): string | null {
  const value = object[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function booleanField(object: JsonObject, key: string): boolean | null {
  const value = object[key];
  return typeof value === "boolean" ? value : null;
}

export function summarizeText(value: string): TextSummary {
  return {
    present: true,
    char_count: value.length,
    line_count: countLines(value),
    code_fence_count: countMatches(value, /```/g)
  };
}

export function summarizeToolInput(toolName: string | null, value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (toolName === "Bash") {
    return summarizeBashInput(value);
  }

  if (isApplyPatchTool(toolName)) {
    return summarizeApplyPatchInput(value);
  }

  if (isMcpTool(toolName)) {
    return summarizeMcpInput(toolName, value);
  }

  return summarizeJsonShape(value, "generic");
}

export function summarizeToolResponse(toolName: string | null, value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (toolName === "Bash") {
    return summarizeBashResponse(value);
  }

  if (isMcpTool(toolName)) {
    return summarizeMcpResponse(value);
  }

  return summarizeGenericResponse(value);
}

export function summarizeJsonShape(value: unknown, kind: string): Record<string, unknown> {
  if (Array.isArray(value)) {
    return {
      kind,
      value_type: "array",
      item_count: value.length
    };
  }

  if (isJsonObject(value)) {
    return {
      kind,
      value_type: "object",
      keys: sortedKeys(value)
    };
  }

  return {
    kind,
    value_type: typeof value
  };
}

export function isApplyPatchTool(toolName: string | null): boolean {
  return toolName === "apply_patch" || toolName === "Edit" || toolName === "Write";
}

export function isMcpTool(toolName: string | null): toolName is string {
  return Boolean(toolName?.startsWith("mcp__"));
}

function summarizeBashInput(value: unknown): Record<string, unknown> {
  const command = readCommandText(value);
  if (!command) {
    return summarizeJsonShape(value, "bash");
  }

  const rawCommandName = readRawCommandName(command);
  const commandName = classifyKnownValue(rawCommandName, SAFE_COMMAND_NAMES);
  const gitSubcommand =
    rawCommandName === "git" ? classifyKnownValue(readRawSubcommand(command, "git"), SAFE_GIT_SUBCOMMANDS) : null;
  const ghSubcommand =
    rawCommandName === "gh" ? classifyKnownValue(readRawSubcommand(command, "gh"), SAFE_GH_SUBCOMMANDS) : null;

  return {
    kind: "bash",
    command_present: true,
    command_length: command.length,
    line_count: countLines(command),
    command_name: commandName,
    git_subcommand: gitSubcommand,
    gh_subcommand: ghSubcommand,
    has_pipe: command.includes("|"),
    has_redirect: /(^|\s)([<>]|2>|&>)/.test(command),
    has_heredoc: command.includes("<<"),
    mentions_git: /\bgit\b/.test(command),
    mentions_gh: /\bgh\b/.test(command),
    mentions_codex: /\bcodex\b/.test(command),
    mentions_worktree: /\bworktree\b/.test(command),
    mentions_test_runner: /\b(test|pytest|vitest|jest|cargo test|go test)\b/.test(command)
  };
}

function summarizeApplyPatchInput(value: unknown): Record<string, unknown> {
  const patch = readCommandText(value);
  if (!patch) {
    return summarizeJsonShape(value, "apply_patch");
  }

  const patchSummary = summarizePatch(patch);
  return {
    kind: "apply_patch",
    patch_present: true,
    patch_length: patch.length,
    ...patchSummary
  };
}

function summarizeMcpInput(toolName: string, value: unknown): Record<string, unknown> {
  const parts = toolName.split("__");
  const summary: Record<string, unknown> = {
    kind: "mcp",
    server: parts[1] ?? null,
    tool: parts.slice(2).join("__") || null,
    ...summarizeJsonShape(value, "mcp")
  };

  if (isJsonObject(value)) {
    const selected: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (!SAFE_MCP_VALUE_KEYS.has(key)) {
        continue;
      }

      const safeValue = sanitizePrimitiveMetadataValue(value[key]);
      if (safeValue !== null) {
        selected[key] = safeValue;
      }
    }

    if (Object.keys(selected).length > 0) {
      summary.selected_arguments = selected;
    }
  }

  return summary;
}

function summarizeBashResponse(value: unknown): Record<string, unknown> {
  const summary = summarizeGenericResponse(value);

  if (!isJsonObject(value)) {
    return { kind: "bash_response", ...summary };
  }

  return {
    kind: "bash_response",
    ...summary,
    exit_code: numberLikeField(value, ["exit_code", "exitCode", "status"]),
    stdout: summarizeStringProperty(value, ["stdout", "output"]),
    stderr: summarizeStringProperty(value, ["stderr", "error"])
  };
}

function summarizeMcpResponse(value: unknown): Record<string, unknown> {
  const summary = summarizeGenericResponse(value);
  if (!isJsonObject(value)) {
    return { kind: "mcp_response", ...summary };
  }

  const content = value.content;
  const contentItems = Array.isArray(content) ? content : [];

  return {
    kind: "mcp_response",
    ...summary,
    is_error: typeof value.isError === "boolean" ? value.isError : null,
    content_item_count: contentItems.length,
    text_content_char_count: contentItems.reduce((total, item) => {
      if (isJsonObject(item) && typeof item.text === "string") {
        return total + item.text.length;
      }
      return total;
    }, 0)
  };
}

function summarizeGenericResponse(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    return {
      value_type: "string",
      char_count: value.length,
      line_count: countLines(value)
    };
  }

  if (Array.isArray(value)) {
    return {
      value_type: "array",
      item_count: value.length
    };
  }

  if (isJsonObject(value)) {
    return {
      value_type: "object",
      keys: sortedKeys(value),
      success: typeof value.success === "boolean" ? value.success : null,
      exit_code: numberLikeField(value, ["exit_code", "exitCode", "status"])
    };
  }

  return {
    value_type: typeof value
  };
}

function summarizePatch(patch: string): Record<string, unknown> {
  const files = new Map<string, { path: string; actions: Set<string> }>();
  let added_line_count = 0;
  let removed_line_count = 0;
  let hunk_count = 0;

  for (const line of patch.split(/\r?\n/)) {
    const fileMatch = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (fileMatch) {
      addPatchFile(files, fileMatch[2], fileMatch[1].toLowerCase());
      continue;
    }

    const moveMatch = line.match(/^\*\*\* Move to: (.+)$/);
    if (moveMatch) {
      addPatchFile(files, moveMatch[1], "move");
      continue;
    }

    if (line.startsWith("@@")) {
      hunk_count += 1;
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      added_line_count += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      removed_line_count += 1;
    }
  }

  return {
    file_count: files.size,
    files: Array.from(files.values())
      .slice(0, MAX_PATHS)
      .map((file) => ({ path: file.path, actions: Array.from(file.actions).sort() })),
    added_line_count,
    removed_line_count,
    hunk_count
  };
}

function addPatchFile(files: Map<string, { path: string; actions: Set<string> }>, rawPath: string, action: string): void {
  const sanitizedPath = sanitizePath(rawPath);
  const existing = files.get(sanitizedPath);
  if (existing) {
    existing.actions.add(action);
    return;
  }

  files.set(sanitizedPath, { path: sanitizedPath, actions: new Set([action]) });
}

function readCommandText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isJsonObject(value)) {
    return null;
  }

  for (const key of ["command", "patch", "input"]) {
    const field = value[key];
    if (typeof field === "string" && field.length > 0) {
      return field;
    }
  }

  return null;
}

function readRawCommandName(command: string): string | null {
  const trimmed = command.trim();
  const withoutEnv = trimmed.replace(/^([A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)+/, "");
  const match = withoutEnv.match(/^([A-Za-z0-9_./:@+-]+)/);
  if (!match) {
    return null;
  }

  return path.basename(match[1]);
}

function readRawSubcommand(command: string, executable: string): string | null {
  const match = command.trim().match(new RegExp(`^${executable}\\s+([A-Za-z0-9_-]+)`));
  return match ? match[1] : null;
}

function classifyKnownValue(value: string | null, allowed: Set<string>): string | null {
  if (value === null) {
    return null;
  }

  return allowed.has(value) ? value : "other";
}

function summarizeStringProperty(object: JsonObject, keys: string[]): TextSummary | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string") {
      return summarizeText(value);
    }
  }

  return null;
}

function numberLikeField(object: JsonObject, keys: string[]): number | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function sanitizePrimitiveMetadataValue(value: unknown): string | number | boolean | null {
  if (typeof value === "string") {
    if (value.length > 200 || value.includes("\n") || value.includes("\r")) {
      return null;
    }
    return sanitizePath(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function sanitizePath(value: string): string {
  return path.normalize(value).replaceAll("\\", "/");
}

function sortedKeys(value: JsonObject): string[] {
  return Object.keys(value).sort().slice(0, MAX_KEYS);
}

function countLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

function countMatches(value: string, pattern: RegExp): number {
  return Array.from(value.matchAll(pattern)).length;
}
