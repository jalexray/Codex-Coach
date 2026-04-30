import { Command } from "commander";
import { placeholderResetDemoStateData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { ResetDemoStateData } from "../types/command-data";

export function registerResetDemoStateCommands(program: Command): void {
  const command = addGlobalOptions(program.command("reset_demo_state").description("Reset deterministic demo state."));

  command.action(async () => {
    await runCommand<ResetDemoStateData>("reset_demo_state", command, (ctx) => ({
      data: placeholderResetDemoStateData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
