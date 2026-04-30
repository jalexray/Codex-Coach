import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { openStorage } from "../storage";
import type { ResetDemoStateData } from "../types/command-data";

export function registerResetDemoStateCommands(program: Command): void {
  const command = addGlobalOptions(program.command("reset_demo_state").description("Reset deterministic demo state."));

  command.action(async () => {
    await runCommand<ResetDemoStateData>("reset_demo_state", command, async (ctx) => {
      const storage = await openStorage({ dataDir: ctx.data_dir, generatedAt: ctx.generated_at });

      try {
        const data = await storage.resetDemoState({ generatedAt: ctx.generated_at });

        return {
          data,
          warnings: [],
          sources: [storage.sourceRef()]
        };
      } finally {
        await storage.close();
      }
    });
  });
}
