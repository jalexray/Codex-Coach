export type JsonObject = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonObject;
}

export interface CliInvocation {
  args: string[];
  stdin?: string;
}

const globalProperties = {
  repo: {
    type: "string",
    description: "Repository path to inspect. Defaults to the MCP server process working directory."
  },
  dataDir: {
    type: "string",
    description: "Override the local Codex Coach data directory."
  },
  demo: {
    type: "boolean",
    description: "Allow deterministic demo fallback data where implemented."
  }
} satisfies JsonObject;

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "status",
    description: "Show Codex Coach local status, storage counts, hook hints, and profile state.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "coach",
    description: "Return the default Codex Coach readout with updates, capability map, recent work, and recommendations.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "get_updates",
    description: "Return Codex changelog updates from the local Codex Coach cache.",
    inputSchema: objectSchema({
      ...globalProperties,
      startupJson: {
        type: "boolean",
        description: "Emit the compact SessionStart hook JSON form."
      }
    })
  },
  {
    name: "mark_updates_seen",
    description: "Update the local last-seen timestamp for Codex updates.",
    inputSchema: objectSchema({
      ...globalProperties,
      seenAt: {
        type: "string",
        description: "Timestamp to store. Defaults to command execution time."
      }
    })
  },
  {
    name: "get_capability_map",
    description: "Return grouped Codex capability status from local metadata.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "get_recent_work",
    description: "Return recent local work items from local metadata.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "get_recommendations",
    description: "Return Codex Coach recommendations for recent work.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "mark_recommendation_feedback",
    description: "Store useful or not-useful feedback for a recommendation.",
    inputSchema: objectSchema(
      {
        ...globalProperties,
        recommendationId: {
          type: "string",
          description: "Recommendation ID to update."
        },
        rating: {
          type: "string",
          enum: ["useful", "not-useful"],
          description: "Feedback rating."
        },
        note: {
          type: "string",
          description: "Optional feedback note."
        }
      },
      ["recommendationId", "rating"]
    )
  },
  {
    name: "import_changelog",
    description: "Import bundled Codex changelog records into local storage.",
    inputSchema: objectSchema({
      ...globalProperties,
      refresh: {
        type: "boolean",
        description: "Refresh from official remote sources where implemented."
      }
    })
  },
  {
    name: "reset_demo_state",
    description: "Reset deterministic Codex Coach demo state.",
    inputSchema: objectSchema(globalProperties)
  },
  {
    name: "record_hook_observation",
    description: "Record a Codex hook observation payload in local storage.",
    inputSchema: objectSchema(
      {
        ...globalProperties,
        payload: {
          oneOf: [{ type: "object" }, { type: "string" }],
          description: "Hook payload object or raw JSON string."
        }
      },
      ["payload"]
    )
  },
  {
    name: "delete_local_history",
    description: "Delete plugin-owned Codex Coach local history only.",
    inputSchema: objectSchema(globalProperties)
  }
];

const toolNames = new Set(toolDefinitions.map((tool) => tool.name));

export function buildCliInvocation(toolName: string, rawArgs: unknown): CliInvocation {
  if (!toolNames.has(toolName)) {
    throw new Error(`Unknown Codex Coach MCP tool: ${toolName}`);
  }

  const input = toObject(rawArgs);
  const args = [toolName, "--json"];
  appendStringFlag(args, "--repo", input.repo);
  appendStringFlag(args, "--data-dir", input.dataDir);
  appendBooleanFlag(args, "--demo", input.demo);

  switch (toolName) {
    case "get_updates":
      appendBooleanFlag(args, "--startup-json", input.startupJson);
      break;
    case "mark_updates_seen":
      appendStringFlag(args, "--seen-at", input.seenAt);
      break;
    case "mark_recommendation_feedback":
      appendRequiredStringFlag(args, "--recommendation-id", input.recommendationId);
      appendRequiredStringFlag(args, "--rating", input.rating);
      appendStringFlag(args, "--note", input.note);
      break;
    case "import_changelog":
      appendBooleanFlag(args, "--refresh", input.refresh);
      break;
    case "record_hook_observation":
      return {
        args,
        stdin: stringifyPayload(input.payload)
      };
  }

  return { args };
}

function objectSchema(properties: JsonObject, required: string[] = []): JsonObject {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false
  };
}

function toObject(rawArgs: unknown): JsonObject {
  if (rawArgs === undefined || rawArgs === null) {
    return {};
  }

  if (typeof rawArgs !== "object" || Array.isArray(rawArgs)) {
    throw new Error("Tool arguments must be a JSON object.");
  }

  return rawArgs as JsonObject;
}

function appendStringFlag(args: string[], flag: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (typeof value !== "string") {
    throw new Error(`${flag} must be a string.`);
  }

  args.push(flag, value);
}

function appendRequiredStringFlag(args: string[], flag: string, value: unknown): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${flag} is required.`);
  }

  args.push(flag, value);
}

function appendBooleanFlag(args: string[], flag: string, value: unknown): void {
  if (value === undefined || value === null || value === false) {
    return;
  }

  if (value !== true) {
    throw new Error(`${flag} must be a boolean.`);
  }

  args.push(flag);
}

function stringifyPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return JSON.stringify(payload);
  }

  throw new Error("--payload is required.");
}
