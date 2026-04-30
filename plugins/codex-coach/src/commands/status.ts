import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { openStorage } from "../storage";
import type { StatusData } from "../types/command-data";

export function registerStatusCommands(program: Command): void {
  const command = addGlobalOptions(program.command("status").description("Show Codex Coach local status."));

  command.action(async () => {
    await runCommand<StatusData>("status", command, async (ctx) => {
      const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

      try {
        const profile = storage.getOrCreateLocalProfile(ctx.generated_at);
        const counts = storage.getCounts();
        const lastHookObservedAt = storage.getLastHookObservationAt();

        return {
          data: {
            profile,
            data_dir: storage.getDataDir(),
            repo: ctx.repo,
            hooks: {
              enabled_hint: lastHookObservedAt ? "enabled" : "unknown",
              config_hint: lastHookObservedAt
                ? "Hook observations have been recorded in local storage."
                : "No hook observations recorded yet; hook capture may be disabled or unused.",
              last_observed_at: lastHookObservedAt
            },
            last_seen_updates_at: profile.last_seen_updates_at,
            counts
          },
          warnings: [],
          sources: [storage.sourceRef(sumCounts(counts))]
        };
      } finally {
        await storage.close();
      }
    });
  });
}

function sumCounts(counts: StatusData["counts"]): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
