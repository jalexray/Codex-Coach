import { SOURCE_LABELS } from "../types/sources";
import type { WorkItem } from "../types/entities";

const DEFAULT_LOCAL_USER_ID = "local-default";

export function createDemoFallbackWorkItems(input: { repoPath: string; generatedAt: string }): WorkItem[] {
  return [
    {
      id: "demo-settings-layout",
      user_id: DEFAULT_LOCAL_USER_ID,
      source: SOURCE_LABELS.DEMO_FALLBACK,
      title: "Debugged settings page layout across desktop and mobile",
      summary: "Demo fallback work item for responsive settings layout QA using filenames, diff stats, and topic signals.",
      completed_at: input.generatedAt,
      signals: {
        source_kind: "demo-fallback",
        demo_key: "settings-layout",
        changed_files: [
          "app/settings/page.tsx",
          "app/settings/settings.css",
          "tests/settings-layout.spec.ts"
        ],
        changed_file_count: 3,
        insertions: 82,
        deletions: 24,
        binary_files: 0,
        total_line_changes: 106,
        top_level_directories: ["app", "tests"],
        file_extensions: [".css", ".ts", ".tsx"],
        branch_names: ["demo/settings-layout"],
        keywords: ["responsive", "settings", "ui-qa"],
        inferred_capabilities: ["computer-use", "multimodal-input"],
        inference_reasons: [
          "Responsive UI/layout work across desktop and mobile benefits from rendered inspection.",
          "The work item carries visual QA signals that can use screenshots or other image context."
        ],
        sparse_history: true
      },
      artifact_url: null,
      repo_path: input.repoPath
    },
    {
      id: "demo-auth-billing-refactor",
      user_id: DEFAULT_LOCAL_USER_ID,
      source: SOURCE_LABELS.DEMO_FALLBACK,
      title: "Large refactor across auth and billing",
      summary: "Demo fallback work item for a broad auth and billing refactor using filenames, diff stats, and branch topic signals.",
      completed_at: subtractDays(input.generatedAt, 1),
      signals: {
        source_kind: "demo-fallback",
        demo_key: "auth-billing-refactor",
        changed_files: [
          "src/auth/session.ts",
          "src/auth/login.ts",
          "src/auth/permissions.ts",
          "src/billing/invoices.ts",
          "src/billing/subscriptions.ts",
          "tests/auth-billing-refactor.test.ts"
        ],
        changed_file_count: 12,
        insertions: 640,
        deletions: 410,
        binary_files: 0,
        total_line_changes: 1050,
        top_level_directories: ["src", "tests"],
        file_extensions: [".ts"],
        branch_names: ["demo/auth-billing-refactor"],
        keywords: ["auth", "billing", "large-change", "refactor"],
        inferred_capabilities: ["parallel-agents", "cloud-task"],
        inference_reasons: [
          "The work spans separable auth and billing areas that fit parallel task execution.",
          "The change is large enough to consider delegated cloud task execution."
        ],
        sparse_history: true
      },
      artifact_url: null,
      repo_path: input.repoPath
    }
  ];
}

function subtractDays(isoTimestamp: string, days: number): string {
  const timestamp = Date.parse(isoTimestamp);
  if (!Number.isFinite(timestamp)) {
    return isoTimestamp;
  }

  return new Date(timestamp - days * 24 * 60 * 60 * 1000).toISOString();
}
