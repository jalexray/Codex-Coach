import { Command } from "commander";
import {
  assertSafeDeleteTarget,
  deletePluginStorageFiles,
  openStorage,
  resolvePluginDataDir,
  type StorageCounts
} from "../storage";
import { addGlobalOptions, runCommand } from "./runner";
import type { DeleteLocalHistoryData } from "../types/command-data";

export function registerDeleteLocalHistoryCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("delete_local_history").description("Delete plugin-owned local Codex Coach history.")
  );

  command.action(async () => {
    await runCommand<DeleteLocalHistoryData>("delete_local_history", command, async (ctx) => {
      assertSafeDeleteTarget({
        dataDir: ctx.data_dir,
        repo: ctx.repo,
        explicitDataDir: isDataDirExplicit(command),
        defaultDataDir: resolvePluginDataDir()
      });

      const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

      try {
        const counts = storage.getCounts();
        const source = storage.sourceRef(sumCounts(counts));
        await storage.close();
        await deletePluginStorageFiles(ctx.data_dir);

        return {
          data: {
            deleted: countsToDeletedRows(counts),
            data_dir: ctx.data_dir
          },
          warnings: [],
          sources: [source]
        };
      } catch (error) {
        await storage.close();
        throw error;
      }
    });
  });
}

function isDataDirExplicit(command: Command): boolean {
  return command.getOptionValueSourceWithGlobals("dataDir") === "cli";
}

function countsToDeletedRows(counts: StorageCounts): DeleteLocalHistoryData["deleted"] {
  return [
    { entity: "codex_updates", count: counts.codex_updates },
    { entity: "capability_events", count: counts.capability_events },
    { entity: "hook_observations", count: counts.hook_observations },
    { entity: "work_items", count: counts.work_items },
    { entity: "recommendations", count: counts.recommendations },
    { entity: "recommendation_feedback", count: counts.recommendation_feedback }
  ];
}

function sumCounts(counts: StorageCounts): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
