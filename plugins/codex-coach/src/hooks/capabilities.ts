import type { CapabilityId } from "../capabilities/taxonomy";
import { isApplyPatchTool, isJsonObject, isMcpTool } from "./sanitizers";

export interface CapabilitySignal {
  capability: CapabilityId;
  confidence: number;
  reason: string;
}

export interface CapabilitySignalInput {
  hookEventName: string;
  toolName: string | null;
  metadata: Record<string, unknown>;
}

export function deriveCapabilitySignals(input: CapabilitySignalInput): CapabilitySignal[] {
  const signals = new Map<CapabilityId, CapabilitySignal>();

  addSignal(signals, "hooks", 0.95, "codex_hook_observed");

  if (input.hookEventName === "Stop") {
    addSignal(signals, "cli-local-chat", 0.45, "codex_turn_stop_observed");
  }

  if (input.hookEventName !== "PostToolUse") {
    return Array.from(signals.values());
  }

  if (input.toolName === "Bash") {
    deriveBashSignals(signals, input.metadata);
  } else if (isApplyPatchTool(input.toolName)) {
    addSignal(signals, "git-workflow", 0.55, "apply_patch_file_edit_observed");
  } else if (isMcpTool(input.toolName)) {
    deriveMcpSignals(signals, input.toolName ?? "");
  } else if (input.toolName) {
    deriveNamedToolSignals(signals, input.toolName);
  }

  return Array.from(signals.values());
}

function deriveBashSignals(signals: Map<CapabilityId, CapabilitySignal>, metadata: Record<string, unknown>): void {
  const toolInput = metadata.tool_input;
  if (!isJsonObject(toolInput)) {
    return;
  }

  const commandName = typeof toolInput.command_name === "string" ? toolInput.command_name : null;
  const gitSubcommand = typeof toolInput.git_subcommand === "string" ? toolInput.git_subcommand : null;
  const ghSubcommand = typeof toolInput.gh_subcommand === "string" ? toolInput.gh_subcommand : null;

  if (commandName === "git" || toolInput.mentions_git === true) {
    addSignal(signals, "git-workflow", 0.8, "bash_git_command_observed");
  }

  if (gitSubcommand === "worktree" || toolInput.mentions_worktree === true) {
    addSignal(signals, "worktree-flow", 0.9, "bash_git_worktree_observed");
  }

  if (commandName === "gh" || toolInput.mentions_gh === true) {
    addSignal(signals, "github-code-review", 0.75, ghSubcommand === "pr" ? "bash_gh_pr_command_observed" : "bash_gh_command_observed");
  }

  if (commandName === "codex" || toolInput.mentions_codex === true) {
    addSignal(signals, "cli-local-chat", 0.75, "bash_codex_command_observed");
  }
}

function deriveMcpSignals(signals: Map<CapabilityId, CapabilitySignal>, toolName: string): void {
  addSignal(signals, "mcp", 0.9, "mcp_tool_observed");

  const lowered = toolName.toLowerCase();
  if (lowered.includes("github") || lowered.includes("pull") || lowered.includes("review")) {
    addSignal(signals, "github-code-review", 0.8, "github_mcp_tool_observed");
  }

  if (lowered.includes("browser") || lowered.includes("computer") || lowered.includes("playwright")) {
    addSignal(signals, "computer-use", 0.8, "browser_or_computer_mcp_tool_observed");
  }

  if (lowered.includes("screenshot") || lowered.includes("image") || lowered.includes("vision")) {
    addSignal(signals, "multimodal-input", 0.7, "visual_mcp_tool_observed");
  }
}

function deriveNamedToolSignals(signals: Map<CapabilityId, CapabilitySignal>, toolName: string): void {
  const lowered = toolName.toLowerCase();

  if (lowered.includes("browser") || lowered.includes("computer")) {
    addSignal(signals, "computer-use", 0.75, "browser_or_computer_tool_observed");
  }

  if (lowered.includes("github") || lowered.includes("pull_request") || lowered.includes("review")) {
    addSignal(signals, "github-code-review", 0.75, "github_tool_observed");
  }

  if (lowered.includes("spawn_agent") || lowered.includes("subagent")) {
    addSignal(signals, "parallel-agents", 0.75, "agent_tool_observed");
  }
}

function addSignal(
  signals: Map<CapabilityId, CapabilitySignal>,
  capability: CapabilityId,
  confidence: number,
  reason: string
): void {
  const existing = signals.get(capability);
  if (!existing || existing.confidence < confidence) {
    signals.set(capability, { capability, confidence, reason });
  }
}
