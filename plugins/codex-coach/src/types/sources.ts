export const SOURCE_LABELS = {
  GIT: "git",
  HOOK: "hook",
  USER_SUMMARY: "user-summary",
  CODEX_CHANGELOG: "codex-changelog",
  CODEX_SESSION: "codex-session",
  CODEX_PLUGIN_METADATA: "codex-plugin-metadata",
  LOCAL_IMPORT: "local-import",
  DEMO_FALLBACK: "demo-fallback"
} as const;

export type SourceLabel = (typeof SOURCE_LABELS)[keyof typeof SOURCE_LABELS];

export interface SourceRef {
  label: SourceLabel;
  description: string;
  path?: string;
  url?: string;
  record_count?: number;
}
