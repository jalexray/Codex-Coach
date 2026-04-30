import { randomUUID } from "node:crypto";
import { SOURCE_LABELS } from "../types/sources";
import type { CapabilityEvent, HookObservation } from "../types/entities";
import { deriveCapabilitySignals, type CapabilitySignal } from "./capabilities";
import {
  booleanField,
  isJsonObject,
  parseHookJson,
  stringField,
  summarizeText,
  summarizeToolInput,
  summarizeToolResponse
} from "./sanitizers";

export interface HookObservationBuildResult {
  observation: HookObservation | null;
  capabilityEvents: CapabilityEvent[];
  warnings: string[];
}

export function buildHookObservation(input: {
  stdin: string | null;
  observedAt: string;
  userId?: string;
}): HookObservationBuildResult {
  const parsed = parseHookJson(input.stdin);
  if (!parsed.payload) {
    return {
      observation: null,
      capabilityEvents: [],
      warnings: parsed.warnings
    };
  }

  const hookEventName = stringField(parsed.payload, "hook_event_name");
  if (!hookEventName) {
    return {
      observation: null,
      capabilityEvents: [],
      warnings: [...parsed.warnings, "missing_hook_event_name"]
    };
  }

  const sessionId = stringField(parsed.payload, "session_id");
  const turnId = stringField(parsed.payload, "turn_id");
  const toolName = stringField(parsed.payload, "tool_name");
  const metadata = buildSanitizedMetadata(parsed.payload, hookEventName, toolName);
  const signals = deriveCapabilitySignals({ hookEventName, toolName, metadata });
  const observationId = randomUUID();
  const observation: HookObservation = {
    id: observationId,
    session_id: sessionId,
    turn_id: turnId,
    hook_event_name: hookEventName,
    tool_name: toolName,
    source: SOURCE_LABELS.HOOK,
    observed_at: input.observedAt,
    capability_tags: signals.map((signal) => signal.capability),
    metadata
  };

  return {
    observation,
    capabilityEvents: signals.map((signal) =>
      buildCapabilityEvent({
        signal,
        observation,
        userId: input.userId ?? "local-default"
      })
    ),
    warnings: parsed.warnings
  };
}

function buildSanitizedMetadata(
  payload: Record<string, unknown>,
  hookEventName: string,
  toolName: string | null
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    schema_version: 1,
    data_policy: {
      raw_prompts_stored: false,
      raw_source_contents_stored: false,
      full_tool_responses_stored: false
    }
  };

  copyStringField(payload, metadata, "transcript_path");
  copyStringField(payload, metadata, "cwd");
  copyStringField(payload, metadata, "model");

  if (hookEventName === "PostToolUse") {
    copyStringField(payload, metadata, "tool_use_id");
    const toolInput = summarizeToolInput(toolName, payload.tool_input);
    const toolResponse = summarizeToolResponse(toolName, payload.tool_response);
    if (toolInput) {
      metadata.tool_input = toolInput;
    }
    if (toolResponse) {
      metadata.tool_response = toolResponse;
    }
  }

  if (hookEventName === "Stop") {
    const stopHookActive = booleanField(payload, "stop_hook_active");
    if (stopHookActive !== null) {
      metadata.stop_hook_active = stopHookActive;
    }

    const lastAssistantMessage = payload.last_assistant_message;
    metadata.last_assistant_message = typeof lastAssistantMessage === "string"
      ? summarizeText(lastAssistantMessage)
      : { present: false };
  }

  return metadata;
}

function buildCapabilityEvent(input: {
  signal: CapabilitySignal;
  observation: HookObservation;
  userId: string;
}): CapabilityEvent {
  return {
    id: randomUUID(),
    user_id: input.userId,
    capability: input.signal.capability,
    source: SOURCE_LABELS.HOOK,
    occurred_at: input.observation.observed_at,
    confidence: input.signal.confidence,
    metadata: {
      hook_observation_id: input.observation.id,
      hook_event_name: input.observation.hook_event_name,
      tool_name: input.observation.tool_name,
      reason: input.signal.reason,
      session_id_present: Boolean(input.observation.session_id),
      turn_id_present: Boolean(input.observation.turn_id),
      evidence: buildEventEvidence(input.observation.metadata)
    }
  };
}

function buildEventEvidence(metadata: Record<string, unknown>): Record<string, unknown> {
  const evidence: Record<string, unknown> = {};

  const toolInput = metadata.tool_input;
  if (isJsonObject(toolInput)) {
    for (const key of ["kind", "command_name", "git_subcommand", "gh_subcommand", "file_count"]) {
      if (toolInput[key] !== undefined) {
        evidence[key] = toolInput[key];
      }
    }
  }

  if (metadata.stop_hook_active !== undefined) {
    evidence.stop_hook_active = metadata.stop_hook_active;
  }

  return evidence;
}

function copyStringField(source: Record<string, unknown>, target: Record<string, unknown>, key: string): void {
  const value = stringField(source, key);
  if (value !== null) {
    target[key] = value;
  }
}
