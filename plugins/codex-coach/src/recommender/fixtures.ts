import { SOURCE_LABELS } from "../types/sources";
import type { WorkItem } from "../types/entities";

const DEMO_USER_ID = "local-default";

export function demoWorkItems(): WorkItem[] {
  return [
    {
      id: "demo-settings-layout",
      user_id: DEMO_USER_ID,
      source: SOURCE_LABELS.DEMO_FALLBACK,
      title: "Debugged settings page layout across desktop and mobile",
      summary:
        "Investigated responsive settings page layout issues across browser viewports and validated the UI behavior.",
      completed_at: "2026-04-29T18:00:00.000Z",
      signals: {
        terms: ["settings", "layout", "desktop", "mobile", "responsive", "browser", "ui"],
        ui_debug: true,
        browser_debug: true,
        viewport_count: 2,
        files_changed: 6,
        areas: ["frontend"]
      },
      artifact_url: null,
      repo_path: null
    },
    {
      id: "demo-auth-billing-refactor",
      user_id: DEMO_USER_ID,
      source: SOURCE_LABELS.DEMO_FALLBACK,
      title: "Large refactor across auth and billing",
      summary:
        "Refactored shared authentication and billing flows with broad changes across separate product areas.",
      completed_at: "2026-04-29T17:00:00.000Z",
      signals: {
        terms: ["large refactor", "auth", "billing", "multiple areas"],
        files_changed: 24,
        diff_lines: 1850,
        areas: ["auth", "billing"],
        large_diff: true,
        refactor: true
      },
      artifact_url: null,
      repo_path: null
    }
  ];
}
