export const CAPABILITY_STATUS_VALUES = [
  "used_recently",
  "tried_before_not_recent",
  "not_observed",
  "unknown_or_not_connected"
] as const;

export type CapabilityStatus = (typeof CAPABILITY_STATUS_VALUES)[number];

export const CAPABILITY_TAXONOMY = [
  {
    id: "cli-local-chat",
    label: "Local Codex CLI pairing",
    description: "Local Codex CLI pairing.",
    group_id: "pairing-surfaces"
  },
  {
    id: "codex-app-session",
    label: "Codex app usage",
    description: "Codex app usage.",
    group_id: "pairing-surfaces"
  },
  {
    id: "cloud-task",
    label: "Delegated cloud task",
    description: "Delegated app or cloud-backed task.",
    group_id: "delegation-and-parallelism"
  },
  {
    id: "parallel-agents",
    label: "Parallel agents",
    description: "Multiple agents working in parallel.",
    group_id: "delegation-and-parallelism"
  },
  {
    id: "worktree-flow",
    label: "Worktree-backed flow",
    description: "Worktree-backed task isolation.",
    group_id: "delegation-and-parallelism"
  },
  {
    id: "skills",
    label: "Skills",
    description: "Reusable Codex skills.",
    group_id: "automation-and-reuse"
  },
  {
    id: "automations",
    label: "Automations",
    description: "Scheduled or triggered Codex workflows.",
    group_id: "automation-and-reuse"
  },
  {
    id: "hooks",
    label: "Hooks",
    description: "Codex hooks setup or use.",
    group_id: "automation-and-reuse"
  },
  {
    id: "plugins",
    label: "Plugins",
    description: "Installing or building Codex plugins.",
    group_id: "automation-and-reuse"
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Connecting local or remote tools through MCP.",
    group_id: "automation-and-reuse"
  },
  {
    id: "git-workflow",
    label: "Git workflow",
    description: "Branch, diff, commit, PR, or merge assistance.",
    group_id: "review-and-git-workflows"
  },
  {
    id: "computer-use",
    label: "Computer use",
    description: "Browser or UI interaction.",
    group_id: "context-and-input-modes"
  },
  {
    id: "multimodal-input",
    label: "Multimodal input",
    description: "Screenshots, diagrams, images, or visual context.",
    group_id: "context-and-input-modes"
  },
  {
    id: "github-code-review",
    label: "GitHub code review",
    description: "Codex review on GitHub pull requests.",
    group_id: "review-and-git-workflows"
  },
  {
    id: "ide-extension",
    label: "IDE pairing",
    description: "IDE-based pairing.",
    group_id: "pairing-surfaces"
  },
  {
    id: "voice-or-mobile",
    label: "Voice or mobile",
    description: "Future optional mobile or voice workflow.",
    group_id: "context-and-input-modes"
  }
] as const;

export type CapabilityId = (typeof CAPABILITY_TAXONOMY)[number]["id"];
export type CapabilityGroupId = (typeof CAPABILITY_TAXONOMY)[number]["group_id"];

export const CAPABILITY_IDS = CAPABILITY_TAXONOMY.map((capability) => capability.id) as CapabilityId[];

export const CAPABILITY_GROUPS: Array<{
  id: CapabilityGroupId;
  label: string;
  capability_ids: CapabilityId[];
}> = [
  {
    id: "pairing-surfaces",
    label: "Pairing surfaces",
    capability_ids: ["cli-local-chat", "codex-app-session", "ide-extension"]
  },
  {
    id: "delegation-and-parallelism",
    label: "Delegation and parallelism",
    capability_ids: ["cloud-task", "parallel-agents", "worktree-flow"]
  },
  {
    id: "review-and-git-workflows",
    label: "Review and git workflows",
    capability_ids: ["git-workflow", "github-code-review"]
  },
  {
    id: "context-and-input-modes",
    label: "Context and input modes",
    capability_ids: ["computer-use", "multimodal-input", "voice-or-mobile"]
  },
  {
    id: "automation-and-reuse",
    label: "Automation and reuse",
    capability_ids: ["skills", "automations", "hooks", "plugins", "mcp"]
  }
];

const CAPABILITY_ID_SET = new Set<string>(CAPABILITY_IDS);

export function isCapabilityId(value: string): value is CapabilityId {
  return CAPABILITY_ID_SET.has(value);
}

export function getCapability(id: CapabilityId) {
  return CAPABILITY_TAXONOMY.find((capability) => capability.id === id);
}
