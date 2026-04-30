import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { resetUpdateDemoState } from "../updates";
import type { ResetDemoStateData } from "../types/command-data";

export function registerResetDemoStateCommands(program: Command): void {
  const command = addGlobalOptions(program.command("reset_demo_state").description("Reset deterministic demo state."));

  command.action(async () => {
    await runCommand<ResetDemoStateData>("reset_demo_state", command, resetUpdateDemoState);
  });
}
