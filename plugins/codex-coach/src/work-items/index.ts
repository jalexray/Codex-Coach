import { importGitRecentWork } from "../importers/git";
import { createDemoFallbackWorkItems } from "./demo-fallback";
import { createGitWorkItems } from "./git-work-items";
import { SOURCE_LABELS } from "../types/sources";
import type { GetRecentWorkData } from "../types/command-data";
import type { CommandContext, CommandResult } from "../types/commands";
import type { WorkItem } from "../types/entities";

export async function getRecentWork(ctx: CommandContext): Promise<GetRecentWorkData> {
  const result = await getRecentWorkResult(ctx);
  return result.data;
}

export async function getRecentWorkResult(ctx: CommandContext): Promise<CommandResult<GetRecentWorkData>> {
  const gitImport = await importGitRecentWork(ctx.repo);
  const gitWorkItems = createGitWorkItems(gitImport);
  const demoWorkItems =
    ctx.demo && gitImport.sparse_history
      ? createDemoFallbackWorkItems({
          repoPath: gitImport.repository.root_path,
          generatedAt: ctx.generated_at
        })
      : [];

  const workItems = [...gitWorkItems, ...demoWorkItems].sort(compareWorkItems);
  const warnings = [...gitImport.warnings];

  if (demoWorkItems.length > 0) {
    warnings.push("demo_fallback_work_items_added");
  }

  return {
    data: {
      repo: gitImport.repository.root_path,
      sparse_history: gitImport.sparse_history,
      work_items: workItems
    },
    warnings,
    sources: [
      {
        label: SOURCE_LABELS.GIT,
        description: "Local git metadata: recent commits, branch names, filenames, diff stats, and timestamps.",
        path: gitImport.repository.root_path,
        record_count: gitWorkItems.length
      },
      ...(demoWorkItems.length > 0
        ? [
            {
              label: SOURCE_LABELS.DEMO_FALLBACK,
              description: "Deterministic demo fallback work items used because git history is sparse.",
              path: gitImport.repository.root_path,
              record_count: demoWorkItems.length
            }
          ]
        : [])
    ]
  };
}

export async function upsertWorkItems(_ctx: CommandContext, _items: WorkItem[]): Promise<void> {
  // Storage is supplied by WS2; this interface keeps WS5 consumers decoupled until that adapter lands.
}

function compareWorkItems(left: WorkItem, right: WorkItem): number {
  return right.completed_at.localeCompare(left.completed_at) || left.id.localeCompare(right.id);
}

export { createDemoFallbackWorkItems } from "./demo-fallback";
export { createGitWorkItems } from "./git-work-items";
