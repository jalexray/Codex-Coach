import { nowIso } from "./time";
import type { JsonFailure, JsonSuccess } from "../types/json";
import type { SourceRef } from "../types/sources";

export function jsonSuccess<T>(input: {
  command: string;
  data: T;
  generated_at?: string;
  warnings?: string[];
  sources?: SourceRef[];
}): JsonSuccess<T> {
  return {
    ok: true,
    command: input.command,
    generated_at: input.generated_at ?? nowIso(),
    data: input.data,
    warnings: input.warnings ?? [],
    sources: input.sources ?? []
  };
}

export function jsonFailure(input: {
  command: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  generated_at?: string;
}): JsonFailure {
  return {
    ok: false,
    command: input.command,
    generated_at: input.generated_at ?? nowIso(),
    error: {
      code: input.code,
      message: input.message,
      details: input.details ?? {}
    }
  };
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
