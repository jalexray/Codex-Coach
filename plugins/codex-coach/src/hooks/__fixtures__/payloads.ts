export const postToolUseApplyPatchFixture = {
  session_id: "fixture-session",
  turn_id: "fixture-turn-1",
  hook_event_name: "PostToolUse",
  tool_name: "apply_patch",
  tool_use_id: "tool-1",
  cwd: "/tmp/codex-coach-fixture",
  model: "gpt-5.3-codex",
  tool_input: {
    command: [
      "*** Begin Patch",
      "*** Update File: src/secret-example.ts",
      "@@",
      "-const token = 'RAW_SOURCE_SECRET';",
      "+const token = readToken();",
      "*** End Patch"
    ].join("\n")
  },
  tool_response: {
    stdout: "RAW_TOOL_RESPONSE_SECRET",
    stderr: "",
    exit_code: 0
  }
};

export const postToolUseBashGitFixture = {
  session_id: "fixture-session",
  turn_id: "fixture-turn-2",
  hook_event_name: "PostToolUse",
  tool_name: "Bash",
  tool_use_id: "tool-2",
  cwd: "/tmp/codex-coach-fixture",
  tool_input: {
    command: "git worktree list && printf '%s\\n' RAW_COMMAND_SECRET"
  },
  tool_response: {
    stdout: "RAW_BASH_STDOUT_SECRET",
    stderr: "",
    exit_code: 0
  }
};

export const postToolUseMcpFixture = {
  session_id: "fixture-session",
  turn_id: "fixture-turn-3",
  hook_event_name: "PostToolUse",
  tool_name: "mcp__github__pull_request_review",
  tool_use_id: "tool-3",
  cwd: "/tmp/codex-coach-fixture",
  tool_input: {
    owner: "openai",
    repo: "codex",
    pull_number: 42,
    body: "RAW_MCP_BODY_SECRET"
  },
  tool_response: {
    content: [{ type: "text", text: "RAW_MCP_RESPONSE_SECRET" }],
    isError: false
  }
};

export const stopFixture = {
  session_id: "fixture-session",
  turn_id: "fixture-turn-4",
  hook_event_name: "Stop",
  cwd: "/tmp/codex-coach-fixture",
  stop_hook_active: false,
  last_assistant_message: "RAW_ASSISTANT_MESSAGE_SECRET\n```ts\nconst source = 'do not store';\n```"
};
