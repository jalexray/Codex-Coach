import { Command } from "commander";
import { placeholderCoachData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { CoachData } from "../types/command-data";

export function registerCoachCommands(program: Command): void {
  const command = addGlobalOptions(program.command("coach").description("Return the default Codex Coach readout payload."));

  command.action(async () => {
    await runCommand<CoachData>("coach", command, (ctx) => ({
      data: placeholderCoachData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
