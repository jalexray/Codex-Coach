import type { SourceRef } from "./sources";

export interface GlobalOptions {
  repo: string;
  json: boolean;
  data_dir: string;
  demo: boolean;
}

export interface CommandContext extends GlobalOptions {
  command: string;
  generated_at: string;
}

export interface CommandResult<T> {
  data: T;
  warnings?: string[];
  sources?: SourceRef[];
}
