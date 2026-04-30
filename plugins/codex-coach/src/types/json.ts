import type { SourceRef } from "./sources";

export interface JsonSuccess<T> {
  ok: true;
  command: string;
  generated_at: string;
  data: T;
  warnings: string[];
  sources: SourceRef[];
}

export interface JsonFailure {
  ok: false;
  command: string;
  generated_at: string;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export type JsonEnvelope<T> = JsonSuccess<T> | JsonFailure;
