import { Command } from "commander";
import { placeholderUpdatesData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { GetUpdatesData } from "../types/command-data";

export function registerGetUpdatesCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_updates").description("Return Codex changelog updates."));

  command.action(async () => {
    await runCommand<GetUpdatesData>("get_updates", command, (ctx) => ({
      data: placeholderUpdatesData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
